import subprocess
import sys
import os
import time

def main():
    # Detect command names
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    python_cmd = sys.executable or "python"

    print("==================================================")
    print("      Starting Bill Generate Multi-Server...      ")
    print("==================================================")

    # Resolve directories
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    processes = []
    try:
        # 1. Start backend
        print("-> Launching Flask backend on http://localhost:7500...")
        backend_proc = subprocess.Popen(
            [python_cmd, "app.py"],
            cwd=backend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        processes.append(backend_proc)

        # Pause slightly to let backend spin up
        time.sleep(1.5)

        # 2. Start frontend
        print("-> Launching Vite frontend on http://localhost:7501...")
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        processes.append(frontend_proc)

        print("\n==================================================")
        print(" Both services are active. Press Ctrl+C to terminate.")
        print("==================================================")

        # Keep running and check if any subprocess terminates
        while True:
            for proc in processes:
                if proc.poll() is not None:
                    print(f"\n[System] Process {proc.pid} terminated. Cleaning up...")
                    return
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[System] KeyboardInterrupt detected. Stopping all servers...")
    finally:
        for proc in processes:
            if proc.poll() is None:
                print(f"[System] Stopping server process {proc.pid}...")
                if os.name == "nt":
                    # On Windows, use taskkill to recursively terminate the process tree (Vite/Node)
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    proc.terminate()
        print("[System] Shutdown complete.")

if __name__ == "__main__":
    main()
