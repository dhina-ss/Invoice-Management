"""
pdf_signer.py
─────────────
Utility module for digitally signing PDF files using a PKCS#11 USB token
(e.g. the eMudhra / SafeNet token with eps2003csp11v2_s.dll).

Used exclusively for Tidy Corporate Services invoices.

pyhanko ≥ 0.21 API change
──────────────────────────
PKCS11Signer now takes a pre-opened pkcs11.Session (from python-pkcs11),
NOT the module path / PIN directly.  The session is opened here via the
python-pkcs11 library and passed in as `pkcs11_session=`.
"""

import os
import tempfile

import pkcs11                                                   # python-pkcs11
from pyhanko.sign import signers
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.pkcs11 import PKCS11Signer
from pyhanko.stamp import TextStampStyle

# ── Configuration ─────────────────────────────────────────────────────────────
# Path to the PKCS#11 shared library (.dll) for the USB token driver.
# NOTE: Use eps2003csp11v2.dll (the full PKCS#11 module, ~1.4 MB), NOT
#       eps2003csp11v2_s.dll (the tiny CSP stub, ~48 KB) — the stub does
#       not export standard PKCS#11 C_* functions needed by python-pkcs11.
PKCS11_MODULE = os.environ.get(
    "PKCS11_MODULE",
    r"C:\Windows\System32\eps2003csp11v2.dll",
)

# Slot index (0 = first slot). You can also filter by token label instead.
PKCS11_SLOT = int(os.environ.get("PKCS11_SLOT", "0"))

# User PIN — read from environment variable for security.
PKCS11_PIN = os.environ.get("PKCS11_PIN", "123456789")

# Label of the signing certificate on the token (only cert 0 has a label).
PKCS11_CERT_LABEL = os.environ.get("PKCS11_CERT_LABEL", "Arul Jemila A")

# ID of the private key on the token.
# The key has a blank label but its ID bytes match the cert's ID.
# ID = ASCII bytes of 'Arul Jemila A' = 4172756c204a656d696c612041
PKCS11_KEY_ID = bytes.fromhex(
    os.environ.get("PKCS11_KEY_ID", "4172756c204a656d696c612041")
)

# Signature field position on the first page (x1, y1, x2, y2) in PDF user-units.
# Positioned at the authorized-signatory area of a Tidy invoice.
SIG_BOX = (390, 50, 565, 115)
SIG_PAGE = 0
SIG_FIELD_NAME = "TidySignature"


def sign_pdf_bytes(
    input_pdf_bytes: bytes,
    user_pin: str | None = None,
    sig_box: tuple | None = None,
) -> bytes:
    """
    Digitally sign *input_pdf_bytes* using the configured PKCS#11 token.

    Parameters
    ----------
    input_pdf_bytes : bytes
        Raw bytes of the unsigned PDF.
    user_pin : str | None
        Override the PIN from the PKCS11_PIN environment variable.
    sig_box : tuple | None
        (x1, y1, x2, y2) in PDF points for the signature field.
        When provided by the frontend (measured from the DOM element's position)
        the signature widget appears exactly over the visual placeholder.
        Falls back to the hardcoded SIG_BOX if None.

    Returns
    -------
    bytes
        Raw bytes of the signed PDF ready to be streamed to the client.

    Raises
    ------
    RuntimeError
        If the PKCS#11 module is missing or the PIN is unset.
    ValueError
        If *input_pdf_bytes* is empty.
    """
    if not input_pdf_bytes:
        raise ValueError("input_pdf_bytes must not be empty.")

    pin = user_pin or PKCS11_PIN
    if not pin:
        raise RuntimeError(
            "PKCS11_PIN is not set. "
            "Set the PKCS11_PIN environment variable or pass user_pin."
        )

    if not os.path.exists(PKCS11_MODULE):
        raise RuntimeError(
            f"PKCS#11 module not found at: {PKCS11_MODULE}\n"
            "Ensure your USB token driver is installed and PKCS11_MODULE is correct."
        )

    # Write input to a temp file (pyhanko's IncrementalPdfFileWriter needs seekable I/O)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
        tmp_in.write(input_pdf_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path.replace(".pdf", "_signed.pdf")

    # Use the caller-supplied box (from DOM measurement) or fall back to default
    box = sig_box if sig_box else SIG_BOX

    try:
        # ── Open the PKCS#11 session (python-pkcs11 API) ──────────────────────
        lib = pkcs11.lib(PKCS11_MODULE)
        slots = lib.get_slots(token_present=True)
        if not slots:
            raise RuntimeError("No PKCS#11 slots with a token found.")
        token = slots[PKCS11_SLOT].get_token()

        with token.open(user_pin=pin) as session:
            # ── Prepare the PDF writer ────────────────────────────────────────
            with open(tmp_in_path, "rb") as inf:
                writer = IncrementalPdfFileWriter(inf)

                # Add an invisible signature field at the signatory area
                append_signature_field(
                    writer,
                    SigFieldSpec(
                        sig_field_name=SIG_FIELD_NAME,
                        box=box,
                        on_page=SIG_PAGE,
                    ),
                )

                # ── Build the signer with the live session ────────────────────
                # cert_label picks the signing cert by its PKCS#11 label.
                # key_id picks the private key by its ID bytes (key has blank label
                # but shares the same ID as the cert: ASCII of 'Arul Jemila A').
                signer = PKCS11Signer(
                    pkcs11_session=session,
                    cert_label=PKCS11_CERT_LABEL,
                    key_id=PKCS11_KEY_ID,
                )

                stamp_style = TextStampStyle(
                    border_width=0,
                    background=None,
                    stamp_text='Digitally signed by %(signer)s\nDate: %(ts)s',
                )

                pdf_signer = signers.PdfSigner(
                    signers.PdfSignatureMetadata(field_name=SIG_FIELD_NAME),
                    signer=signer,
                    stamp_style=stamp_style,
                )

                with open(tmp_out_path, "wb") as outf:
                    pdf_signer.sign_pdf(writer, output=outf)

        with open(tmp_out_path, "rb") as f:
            return f.read()

    finally:
        # Always clean up temp files regardless of success/failure
        for path in (tmp_in_path, tmp_out_path):
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except OSError:
                pass

