from flask import Blueprint, request, jsonify
from database import execute_query

invoice_bp = Blueprint("invoice", __name__, url_prefix="/api/invoice-number")

# Prefix map per company
PREFIXES = {
    "Tidy": "TDY",
    "Elite": "ELT",
    "All Care": "ALC",
}

@invoice_bp.route("", methods=["GET"])
def get_invoice_number():
    """
    Return the NEXT invoice number for a given company and optionally advance the counter.
    Query params:
      - company : Tidy | Elite | All Care  (required)
      - advance : true | false             (default false — just peek)
    Example response: { "invoiceNumber": "TDY-0042", "counter": 42 }
    """
    import datetime
    company = request.args.get("company", "Tidy")
    advance = request.args.get("advance", "false").lower() == "true"

    # Determine 2-digit year suffix (e.g. "26" for 2026)
    current_year = datetime.datetime.now().strftime("%y")
    year_suffix = request.args.get("year", current_year)

    row = execute_query("SELECT * FROM invoice_counters WHERE company = %s", (company,), fetch_one=True)
    if not row:
        row = execute_query(
            "INSERT INTO invoice_counters (company, counter) VALUES (%s, 0) RETURNING *",
            (company,),
            fetch_one=True
        )

    counter = row["counter"]
    if advance:
        counter += 1
        execute_query(
            "UPDATE invoice_counters SET counter = %s WHERE company = %s",
            (counter, company)
        )

    if company == "All Care":
        invoice_number = f"ALC{year_suffix}{str(counter).zfill(5)}"
    elif company == "Elite":
        invoice_number = f"ELT-{str(counter).zfill(4)}"
    else:
        invoice_number = f"TDY-{str(counter).zfill(4)}"

    return jsonify({
        "company": company,
        "counter": counter,
        "invoiceNumber": invoice_number,
    }), 200

@invoice_bp.route("/reset", methods=["POST"])
def reset_counter():
    """Reset the counter for a company back to 0. Body: { "company": "Tidy" }"""
    payload = request.get_json(force=True) or {}
    company = payload.get("company", "Tidy")

    execute_query(
        "UPDATE invoice_counters SET counter = 0 WHERE company = %s",
        (company,)
    )

    return jsonify({"message": f"Counter reset for {company}"}), 200
