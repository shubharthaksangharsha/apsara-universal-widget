# Install helpers

This folder contains small helper scripts to install and run the backend and the widget (frontend) for different platforms.

Supported scripts
- `run-all.sh` — POSIX shell script (Linux / WSL / Git Bash). Use on Linux/macOS or in WSL.
- `run-all.darwin.sh` — macOS helper (very similar to `run-all.sh`).
- `run-all.ps1` — PowerShell script for Windows (recommended for Windows users).
- `run-all.bat` — Small Windows wrapper that launches `run-all.ps1` (useful from Git Bash or Explorer).

What the helpers do
- Detect the backend folder: prefer a `backend/` subfolder if present, otherwise treat the script folder as the backend.
- Ensure a `.env` exists in the backend folder. If `.env` is missing and a `.env.example` (or `env-template.txt`) is present, the script will copy it to `.env` for you — please edit the file to add real secrets/keys before production.
- Install backend dependencies:
  - If `package.json` exists: runs `npm install` and starts the backend (`npm run start`) in the background. Logs are written to `back.log` / `back.err`.
  - If `requirements.txt` exists: creates a Python venv, installs requirements, and attempts to start a common entrypoint (`app.py`, `server.py`, or `main.py`).
- Install frontend (widget) dependencies located in `apsara-widget-app/` (or parent folder fallback) and run the widget:
  - Prefers `npm run electron` (to launch the Electron desktop app) if a `electron` script exists in `package.json`.
  - Otherwise runs `npm run start` (React dev server).

Usage

Linux / macOS / WSL / Git Bash:

```bash
cd /path/to/apsara-universal-widget
./run-all.sh
```

macOS alternative (explicit helper):

```bash
cd /path/to/apsara-universal-widget
./run-all.darwin.sh
```

Windows (PowerShell - recommended):

```powershell
cd 'C:\path\to\apsara-universal-widget'
.\run-all.ps1
```

Windows (Git Bash or double-click from Explorer):

```bash
./run-all.bat
```

Notes and tips
- The scripts will copy `.env.example` (or `env-template.txt`) to `.env` only when `.env` is missing. Always review the created `.env` and add your real API keys and secrets.
- Backend logs are written to `backend/back.log` and `backend/back.err` (if backend is in `backend/`). Check these when troubleshooting.
- If you prefer visible windows for backend/frontend (instead of background processes), ask and I can add options to open new terminal windows when starting processes.
- If you want the script to skip installs for faster repeated runs, I can add a `--skip-install` flag.

If you run into any runtime errors, paste the terminal output and the `back.log`/`back.err` files and I will help debug.
