import threading
import time
import webbrowser
import sys
import os

from app import create_app

def open_browser():
    """Wait briefly for the Flask server to start, then open the default web browser."""
    time.sleep(1.5)
    print("\nOpening web browser at http://localhost:7500 ...\n")
    webbrowser.open("http://localhost:7500")

if __name__ == '__main__':
    # Create the Flask app
    app = create_app()

    # Start the browser-opening function on a background thread
    threading.Thread(target=open_browser, daemon=True).start()

    print("=" * 50)
    print("  Bill Generator Desktop Application  ")
    print("  Server is running at http://localhost:7500")
    print("  Keep this window open to continue using the application.")
    print("  Close this window to stop the application.")
    print("=" * 50)

    # Run the server (debug=False, use_reloader=False are important for production/bundled apps)
    app.run(host="127.0.0.1", port=7500, debug=False, use_reloader=False)
