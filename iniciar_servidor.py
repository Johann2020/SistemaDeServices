from pathlib import Path
import os
import subprocess
import sys
import time
import webbrowser


ROOT = Path(__file__).resolve().parent
PORT = os.environ.get("PORT", "3000")


def main():
    env = os.environ.copy()
    env["PORT"] = PORT
    server = subprocess.Popen(
        [sys.executable, "server_sqlite.py"],
        cwd=ROOT,
        env=env,
    )
    url = f"http://localhost:{PORT}"
    time.sleep(1)
    webbrowser.open(url)
    print(f"Sistema de Services iniciado en {url}")
    print("Cierre esta ventana para detener el servidor.")
    try:
        server.wait()
    except KeyboardInterrupt:
        server.terminate()


if __name__ == "__main__":
    main()
