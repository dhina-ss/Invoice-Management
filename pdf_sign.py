"""
pdf_sign.py  (CLI entry-point)
──────────────────────────────
Command-line tool to digitally sign a Tidy Corporate Services invoice PDF
using the PKCS#11 USB token (e.g. eMudhra / SafeNet with eps2003csp11v2_s.dll).

The actual signing logic lives in backend/pdf_signer.py.

Usage
─────
  # Using environment variable for the PIN (recommended):
  $env:PKCS11_PIN = "YOUR_PIN"
  python pdf_sign.py input.pdf signed.pdf

  # Or pass the PIN directly (less secure — visible in process list):
  python pdf_sign.py input.pdf signed.pdf --pin YOUR_PIN

Environment variables
─────────────────────
  PKCS11_PIN     – PKCS#11 user PIN (required if --pin not given)
  PKCS11_MODULE  – path to .dll (default: C:\\Windows\\System32\\eps2003csp11v2_s.dll)
  PKCS11_SLOT    – token slot number (default: 0)
"""

import sys
import os
import argparse

# Allow running from repo root without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from pdf_signer import sign_pdf_bytes  # noqa: E402  (after sys.path tweak)


def main():
    parser = argparse.ArgumentParser(
        description="Digitally sign a Tidy invoice PDF using the PKCS#11 USB token."
    )
    parser.add_argument("input",  help="Path to the unsigned PDF file")
    parser.add_argument("output", help="Path to write the signed PDF file")
    parser.add_argument("--pin",  help="PKCS#11 user PIN (falls back to PKCS11_PIN env var)", default=None)
    args = parser.parse_args()

    with open(args.input, "rb") as f:
        pdf_bytes = f.read()

    print(f"Signing '{args.input}' …")
    signed = sign_pdf_bytes(pdf_bytes, user_pin=args.pin)

    with open(args.output, "wb") as f:
        f.write(signed)

    print(f"✓ Signed PDF written to '{args.output}'")


if __name__ == "__main__":
    main()