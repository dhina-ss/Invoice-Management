import json
from flask import Blueprint, request, jsonify
from database import execute_query, format_bill

bills_bp = Blueprint("bills", __name__, url_prefix="/api/bills")

@bills_bp.route("", methods=["GET"])
def list_bills():
    """Return all bills, newest first. Optionally filter by ?company=Tidy"""
    company = request.args.get("company")
    if company:
        query = "SELECT * FROM bills WHERE company = %s ORDER BY created_at DESC"
        params = (company,)
    else:
        query = "SELECT * FROM bills ORDER BY created_at DESC"
        params = ()
    rows = execute_query(query, params, fetch=True)
    return jsonify([format_bill(r) for r in rows]), 200

@bills_bp.route("", methods=["POST"])
def create_bill():
    """Save a new bill. Body: full bill JSON from frontend."""
    payload = request.get_json(force=True)
    if not payload:
        return jsonify({"error": "No data provided"}), 400

    data = payload.get("data", payload)
    company = data.get("company", "Tidy")

    query = """
        INSERT INTO bills (company, bill_date, from_date, to_date, invoice_number, data_json)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    params = (
        company,
        data.get("billDate"),
        data.get("fromDate"),
        data.get("toDate"),
        payload.get("invoiceNumber"),
        json.dumps(data),
    )
    row = execute_query(query, params, fetch_one=True)
    return jsonify(format_bill(row)), 201

@bills_bp.route("/<int:bill_id>", methods=["GET"])
def get_bill(bill_id):
    """Get a single bill by ID."""
    query = "SELECT * FROM bills WHERE id = %s"
    row = execute_query(query, (bill_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(format_bill(row)), 200

@bills_bp.route("/<int:bill_id>", methods=["PUT"])
def update_bill(bill_id):
    """Update an existing bill."""
    payload = request.get_json(force=True)
    if not payload:
        return jsonify({"error": "No data provided"}), 400

    data = payload.get("data", payload)
    
    query = """
        UPDATE bills
        SET company = %s, bill_date = %s, from_date = %s, to_date = %s, invoice_number = %s, data_json = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *
    """
    params = (
        data.get("company"),
        data.get("billDate"),
        data.get("fromDate"),
        data.get("toDate"),
        payload.get("invoiceNumber"),
        json.dumps(data),
        bill_id,
    )
    row = execute_query(query, params, fetch_one=True)
    if not row:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(format_bill(row)), 200

@bills_bp.route("/<int:bill_id>", methods=["DELETE"])
def delete_bill(bill_id):
    """Delete a bill by ID."""
    query = "DELETE FROM bills WHERE id = %s RETURNING id"
    row = execute_query(query, (bill_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify({"message": f"Bill {bill_id} deleted"}), 200

@bills_bp.route("/<int:bill_id>/status", methods=["PUT"])
def update_bill_status(bill_id):
    """Update status of an invoice and store payment/TDS details in data_json."""
    payload = request.get_json(force=True)
    if not payload or "status" not in payload:
        return jsonify({"error": "No status provided"}), 400
    
    new_status = payload.get("status")
    if new_status not in ["Pending", "Received"]:
        return jsonify({"error": "Invalid status value"}), 400

    # Fetch existing data_json to append TDS details
    select_query = "SELECT data_json FROM bills WHERE id = %s"
    bill_row = execute_query(select_query, (bill_id,), fetch_one=True)
    if not bill_row:
        return jsonify({"error": "Bill not found"}), 404

    try:
        data = json.loads(bill_row["data_json"])
    except Exception:
        data = {}

    tds = payload.get("tds")
    received_amount = payload.get("receivedAmount")

    if tds is not None:
        data["tds"] = tds
    if received_amount is not None:
        data["receivedAmount"] = received_amount

    query = """
        UPDATE bills
        SET status = %s, data_json = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *
    """
    row = execute_query(query, (new_status, json.dumps(data), bill_id), fetch_one=True)
    if not row:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(format_bill(row)), 200
