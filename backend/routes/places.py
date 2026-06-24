from flask import Blueprint, request, jsonify
from database import execute_query

places_bp = Blueprint("places", __name__, url_prefix="/api/places")

def format_place(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "place_name": row["place_name"],
        "company": row["company"],
        "type_name": row.get("type_name"),
        "rate": float(row["rate"]) if row.get("rate") is not None else 0.0,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None
    }

@places_bp.route("", methods=["GET"])
def get_places():
    """Return all places, optionally filtered by company."""
    company = request.args.get("company")
    if company:
        query = "SELECT * FROM place WHERE LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', '') ORDER BY place_name ASC"
        params = (company, company)
    else:
        query = "SELECT * FROM place ORDER BY place_name ASC"
        params = ()
    rows = execute_query(query, params, fetch=True)
    return jsonify([format_place(r) for r in rows]), 200

@places_bp.route("", methods=["POST"])
def add_place():
    """Create a new place entry. Body: { "place_name": "Salem", "company": "Tidy", "type_name": "Loaders", "rate": 500.0 }"""
    payload = request.get_json(force=True) or {}
    place_name = payload.get("place_name")
    company = payload.get("company")
    type_name = payload.get("type_name")
    rate = payload.get("rate")

    if not place_name or not company:
        return jsonify({"error": "place_name and company are required"}), 400

    # Avoid duplicate places for the same company.
    # For All Care, we check place_name, company, and type_name.
    # For others, we check place_name and company.
    if company.lower() == 'all care':
        existing = execute_query(
            "SELECT * FROM place WHERE LOWER(place_name) = LOWER(%s) AND LOWER(company) = LOWER(%s) AND LOWER(COALESCE(type_name, '')) = LOWER(%s)",
            (place_name, company, type_name or ''),
            fetch_one=True
        )
    else:
        existing = execute_query(
            "SELECT * FROM place WHERE LOWER(place_name) = LOWER(%s) AND (LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', ''))",
            (place_name, company, company),
            fetch_one=True
        )

    if existing:
        return jsonify(format_place(existing)), 200

    rate_val = float(rate) if rate is not None else 0.0

    row = execute_query(
        "INSERT INTO place (place_name, company, type_name, rate) VALUES (%s, %s, %s, %s) RETURNING *",
        (place_name, company, type_name, rate_val),
        fetch_one=True
    )
    return jsonify(format_place(row)), 201

@places_bp.route("/<int:place_id>", methods=["DELETE"])
def delete_place(place_id):
    """Delete a place entry by ID."""
    row = execute_query("DELETE FROM place WHERE id = %s RETURNING id", (place_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "Place not found"}), 404
    return jsonify({"message": f"Place {place_id} deleted"}), 200
