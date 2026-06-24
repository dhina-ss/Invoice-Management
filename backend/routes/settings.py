import json
from flask import Blueprint, request, jsonify
from database import execute_query

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

# Default addresses shown in the app when nothing is saved yet
DEFAULT_SETTINGS = {
    "customAddresses": {
        "tidy": {
            "client": "M/S DTDC EXPRESS LIMITED,\n136, DIAMOND TOWER,\nA-20 TVK INDUSTRIAL ESTATE,\nGUINDY, CHENNAI-600032.",
            "place": ""
        },
        "allCare": {
            "company": "NO. 381/385, VENNU GOPAL LAYOUT, PN PALAYAM, PAPPANAICKENPALAYAM, COIMBATORE, TAMIL NADU – 641037.\nPhone: +91 95005 95749",
            "client": "DTDC Express Limited,\nNo. 92, Parameshwaran Layout,\nPappanaickenpalayam,\nCoimbatore, Tamil Nadu - 641037"
        },
        "elite": {
            "company": "No. 125, Annai Velakanni Nagar,\nSowripalayam, Coimbatore,\nTamilnadu - 641028.",
            "clientSalem": "DTDC Express Limited,\nNo. 12, Salem Main Road,\nSalem,\nTamil Nadu - 636001.",
            "clientCoimbatore": "DTDC Express Limited,\nNo. 396, Ponniyakadu Thottam,\nSengodagoundan Pudur, Salem-Kochi NH,\nSulur Pirivu, Coimbatore,\nTamil Nadu - 641037."
        }
    }
}

def _get_or_create(key, default_value):
    """Fetch a Settings row by key, or create it with the default value."""
    row = execute_query("SELECT * FROM settings WHERE key = %s", (key,), fetch_one=True)
    if not row:
        row = execute_query(
            "INSERT INTO settings (key, value_json) VALUES (%s, %s) RETURNING *",
            (key, json.dumps(default_value)),
            fetch_one=True
        )
    return row

@settings_bp.route("", methods=["GET"])
def get_settings():
    """Return all stored settings, falling back to defaults."""
    result = {}
    for key, default in DEFAULT_SETTINGS.items():
        row = _get_or_create(key, default)
        result[key] = json.loads(row["value_json"])
    return jsonify(result), 200

@settings_bp.route("", methods=["PUT"])
def update_settings():
    """Update one or more settings keys. Body: { customAddresses: {...}, ... }"""
    payload = request.get_json(force=True)
    if not payload:
        return jsonify({"error": "No data provided"}), 400

    updated = {}
    for key, value in payload.items():
        # Check if settings row exists
        existing = execute_query("SELECT 1 FROM settings WHERE key = %s", (key,), fetch_one=True)
        if existing:
            execute_query(
                "UPDATE settings SET value_json = %s, updated_at = CURRENT_TIMESTAMP WHERE key = %s",
                (json.dumps(value), key)
            )
        else:
            execute_query(
                "INSERT INTO settings (key, value_json) VALUES (%s, %s)",
                (key, json.dumps(value))
            )
        updated[key] = value

    return jsonify({"message": "Settings saved", "updated": updated}), 200
