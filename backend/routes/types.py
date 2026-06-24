from flask import Blueprint, request, jsonify
from database import execute_query

types_bp = Blueprint("types", __name__, url_prefix="/api/types")

def format_type(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "type_name": row["type_name"],
        "company": row["company"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None
    }

@types_bp.route("", methods=["GET"])
def get_types():
    """Return all types, optionally filtered by company."""
    company = request.args.get("company")
    if company:
        query = "SELECT * FROM types WHERE LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', '') ORDER BY type_name ASC"
        params = (company, company)
    else:
        query = "SELECT * FROM types ORDER BY type_name ASC"
        params = ()
    rows = execute_query(query, params, fetch=True)
    return jsonify([format_type(r) for r in rows]), 200

@types_bp.route("", methods=["POST"])
def add_type():
    """Create a new type entry. Body: { "type_name": "Loaders", "company": "All Care" }"""
    payload = request.get_json(force=True) or {}
    type_name = payload.get("type_name")
    company = payload.get("company")

    if not type_name or not company:
        return jsonify({"error": "type_name and company are required"}), 400

    # Avoid duplicate types for the same company (case-insensitive checking)
    existing = execute_query(
        "SELECT * FROM types WHERE LOWER(type_name) = LOWER(%s) AND (LOWER(company) = LOWER(%s) OR REPLACE(LOWER(company), ' ', '') = REPLACE(LOWER(%s), ' ', ''))",
        (type_name, company, company),
        fetch_one=True
    )
    if existing:
        return jsonify(format_type(existing)), 200

    row = execute_query(
        "INSERT INTO types (type_name, company) VALUES (%s, %s) RETURNING *",
        (type_name, company),
        fetch_one=True
    )
    return jsonify(format_type(row)), 201

@types_bp.route("/<int:type_id>", methods=["DELETE"])
def delete_type(type_id):
    """Delete a type entry by ID."""
    row = execute_query("DELETE FROM types WHERE id = %s RETURNING id", (type_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "Type not found"}), 404
    return jsonify({"message": f"Type {type_id} deleted"}), 200
