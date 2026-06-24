from flask import Blueprint, request, jsonify
from database import execute_query

particulars_bp = Blueprint("particulars", __name__, url_prefix="/api/particulars")

def format_particular(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "particular_name": row["particular_name"],
        "rate": float(row["rate"]) if row["rate"] is not None else 0.0,
        "company": row["company"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None
    }

@particulars_bp.route("", methods=["GET"])
def get_particulars():
    """Return all particulars, optionally filtered by company."""
    company = request.args.get("company")
    if company:
        query = "SELECT * FROM particulars WHERE LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', '') ORDER BY particular_name ASC"
        params = (company, company)
    else:
        query = "SELECT * FROM particulars ORDER BY particular_name ASC"
        params = ()
    rows = execute_query(query, params, fetch=True)
    return jsonify([format_particular(r) for r in rows]), 200

@particulars_bp.route("", methods=["POST"])
def add_particular():
    """Create a new particular entry. Body: { "particular_name": "TEA", "rate": 10.00, "company": "Elite" }"""
    payload = request.get_json(force=True) or {}
    particular_name = payload.get("particular_name")
    rate = payload.get("rate")
    company = payload.get("company")

    if not particular_name or rate is None or not company:
        return jsonify({"error": "particular_name, rate, and company are required"}), 400

    try:
        rate_val = float(rate)
    except ValueError:
        return jsonify({"error": "rate must be a number"}), 400

    # Avoid duplicate particulars for the same company (case-insensitive checking)
    existing = execute_query(
        "SELECT * FROM particulars WHERE LOWER(particular_name) = LOWER(%s) AND (LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', ''))",
        (particular_name, company, company),
        fetch_one=True
    )
    if existing:
        return jsonify(format_particular(existing)), 200

    row = execute_query(
        "INSERT INTO particulars (particular_name, rate, company) VALUES (%s, %s, %s) RETURNING *",
        (particular_name, rate_val, company),
        fetch_one=True
    )
    return jsonify(format_particular(row)), 201

@particulars_bp.route("/<int:particular_id>", methods=["DELETE"])
def delete_particular(particular_id):
    """Delete a particular entry by ID."""
    row = execute_query("DELETE FROM particulars WHERE id = %s RETURNING id", (particular_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "Particular not found"}), 404
    return jsonify({"message": f"Particular {particular_id} deleted"}), 200
