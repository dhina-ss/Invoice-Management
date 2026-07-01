import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from database import init_db
from routes.bills import bills_bp
from routes.settings import settings_bp
from routes.invoice import invoice_bp
from routes.places import places_bp
from routes.particulars import particulars_bp
from routes.types import types_bp
from routes.sign import sign_bp
from routes.users import users_bp


def get_frontend_dist_path():
    if getattr(sys, 'frozen', False):
        # Running as a PyInstaller bundle
        return os.path.join(sys._MEIPASS, 'frontend', 'dist')
    else:
        # Running as a normal script
        return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')

def create_app():
    dist_path = get_frontend_dist_path()
    app = Flask(__name__)

    # Initialize PostgreSQL database and create tables if they don't exist
    init_db()

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Allow requests from the Vite dev server and any local origin
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:7501", "http://127.0.0.1:7501"]}})

    # ── Register blueprints ───────────────────────────────────────────────────
    app.register_blueprint(bills_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(invoice_bp)
    app.register_blueprint(places_bp)
    app.register_blueprint(particulars_bp)
    app.register_blueprint(types_bp)
    app.register_blueprint(sign_bp)
    app.register_blueprint(users_bp)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "bill-generate-api"}), 200

    # ── Catch-all route to serve the React frontend ───────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(os.path.join(dist_path, path)):
            return send_from_directory(dist_path, path)
        else:
            return send_from_directory(dist_path, 'index.html')

    return app


if __name__ == "__main__":
    app = create_app()
    print("=" * 50)
    print("  Bill Generate API running on http://localhost:7500")
    print("  Endpoints:")
    print("    GET  /api/health")
    print("    GET  /api/bills")
    print("    POST /api/bills")
    print("    GET  /api/bills/<id>")
    print("    PUT  /api/bills/<id>")
    print("    DELETE /api/bills/<id>")
    print("    GET  /api/settings")
    print("    PUT  /api/settings")
    print("    GET  /api/places")
    print("    POST /api/places")
    print("    DELETE /api/places/<id>")
    print("    GET  /api/invoice-number?company=Tidy&advance=false")
    print("    POST /api/invoice-number/reset")
    print("    POST /api/sign-pdf          (Tidy only — requires PKCS#11 USB token)")
    print("=" * 50)
    app.run(debug=True, port=7500)
