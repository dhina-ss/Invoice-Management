from flask import Blueprint, request, jsonify
from database import execute_query

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

def format_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "pin": row["pin"],
        "email": row["email"],
        "phone": row["phone"],
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
    }

@users_bp.route("", methods=["GET"])
def get_users():
    """Return all users ordered by name."""
    rows = execute_query("SELECT * FROM users ORDER BY name ASC", fetch=True)
    return jsonify([format_user(r) for r in rows]), 200

@users_bp.route("", methods=["POST"])
def add_user():
    """Create a new user. Body: { name, pin, email, phone }"""
    payload = request.get_json(force=True) or {}
    name = payload.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    row = execute_query(
        "INSERT INTO users (name, pin, email, phone) VALUES (%s, %s, %s, %s) RETURNING *",
        (name, payload.get("pin"), payload.get("email"), payload.get("phone")),
        fetch_one=True,
    )
    return jsonify(format_user(row)), 201

@users_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Delete a user by ID."""
    row = execute_query("DELETE FROM users WHERE id = %s RETURNING id", (user_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": f"User {user_id} deleted"}), 200
