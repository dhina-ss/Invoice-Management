"""
routes/sign.py
──────────────
Flask blueprint exposing POST /api/sign-pdf

Accepts a multipart/form-data upload of an unsigned Tidy invoice PDF,
digitally signs it via the PKCS#11 USB token, and returns the signed PDF.

Optional form fields:
  - pin   (str)   : PKCS#11 user PIN. Falls back to PKCS11_PIN env var if omitted.
  - sig_x1/y1/x2/y2 (float): PDF-point coordinates of the signature field.
                              Measured from the DOM by the frontend so the
                              pyhanko widget lands exactly over the sig placeholder.
"""

from flask import Blueprint, request, send_file, jsonify
import io

from pdf_signer import sign_pdf_bytes

sign_bp = Blueprint("sign", __name__, url_prefix="/api")


@sign_bp.route("/sign-pdf", methods=["POST"])
def sign_pdf():
    """
    Sign a Tidy invoice PDF with the PKCS#11 USB token.

    Request (multipart/form-data):
      - pdf    : the unsigned PDF file (required)
      - pin    : PKCS#11 user PIN     (optional)
      - sig_x1 : signature box left   (optional, PDF points)
      - sig_y1 : signature box bottom (optional, PDF points)
      - sig_x2 : signature box right  (optional, PDF points)
      - sig_y2 : signature box top    (optional, PDF points)

    Response:
      - 200 application/pdf : the signed PDF file as an attachment
      - 400                 : missing/invalid PDF
      - 500                 : signing error (token not found, wrong PIN, etc.)
    """
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF file provided. Send it as form-data key 'pdf'."}), 400

    uploaded = request.files["pdf"]
    if uploaded.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    pdf_bytes = uploaded.read()
    if not pdf_bytes:
        return jsonify({"error": "Uploaded PDF is empty."}), 400

    # Optional per-request PIN override
    pin = request.form.get("pin") or None

    # Optional signature field coordinates from the frontend DOM measurement
    sig_box = None
    try:
        x1 = request.form.get("sig_x1")
        y1 = request.form.get("sig_y1")
        x2 = request.form.get("sig_x2")
        y2 = request.form.get("sig_y2")
        if all(v is not None for v in (x1, y1, x2, y2)):
            sig_box = (float(x1), float(y1), float(x2), float(y2))
    except (TypeError, ValueError):
        sig_box = None  # fall back to the configured default

    try:
        signed_bytes = sign_pdf_bytes(pdf_bytes, user_pin=pin, sig_box=sig_box)
    except (RuntimeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"Unexpected signing error: {exc}"}), 500

    # Derive a nice filename: prepend "signed_" to the original filename
    original_name = uploaded.filename or "tidy_invoice.pdf"
    if not original_name.lower().endswith(".pdf"):
        original_name += ".pdf"
    signed_name = "signed_" + original_name

    return send_file(
        io.BytesIO(signed_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=signed_name,
    )
