#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Prefer explicit backend and widget folders if present
if [ -d "$SCRIPT_DIR/backend" ]; then
  BACK_DIR="$SCRIPT_DIR/backend"
else
  BACK_DIR="$SCRIPT_DIR"
fi

if [ -d "$SCRIPT_DIR/apsara-widget-app" ]; then
  WIDGET_DIR="$SCRIPT_DIR/apsara-widget-app"
else
  WIDGET_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

echo "Running install+start helper"
echo "Backend dir: $BACK_DIR"
echo "Widget dir:  $WIDGET_DIR"

# Check .env presence
if [ ! -f "$BACK_DIR/.env" ]; then
  if [ -f "$BACK_DIR/.env.example" ]; then
    echo "'.env' not found in $BACK_DIR. Copying from .env.example..."
    cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
    echo "Copied .env.example -> .env (please verify secrets/keys)."
  else
    echo "\nERROR: .env not found in backend folder ($BACK_DIR)."
    echo "Please create $BACK_DIR/.env (or copy from .env.example) and set required keys, then re-run this script."
    exit 2
  fi
fi

# --- Backend: install & run ---
if [ -f "$BACK_DIR/package.json" ]; then
  echo "\nDetected Node backend (package.json). Installing..."
  (cd "$BACK_DIR" && npm install)

  echo "Starting backend (npm run start) in background. Logs: $BACK_DIR/back.log"
  (cd "$BACK_DIR" && nohup npm run start > "$BACK_DIR/back.log" 2>&1 &)

elif [ -f "$BACK_DIR/requirements.txt" ]; then
  echo "\nDetected Python backend (requirements.txt). Setting up virtualenv and installing..."
  python3 -m venv "$BACK_DIR/.venv" || python -m venv "$BACK_DIR/.venv"
  # shellcheck source=/dev/null
  source "$BACK_DIR/.venv/bin/activate"
  pip install --upgrade pip
  pip install -r "$BACK_DIR/requirements.txt"

  # Try common entrypoints
  if [ -f "$BACK_DIR/app.py" ]; then
    ENTRY="app.py"
  elif [ -f "$BACK_DIR/server.py" ]; then
    ENTRY="server.py"
  elif [ -f "$BACK_DIR/main.py" ]; then
    ENTRY="main.py"
  else
    ENTRY=""
  fi

  if [ -n "$ENTRY" ]; then
    echo "Starting Python backend ($ENTRY) in background. Logs: $BACK_DIR/back.log"
    (cd "$BACK_DIR" && nohup python "$ENTRY" > "$BACK_DIR/back.log" 2>&1 &)
  else
    echo "No obvious Python entrypoint found (app.py / server.py / main.py). Start your backend manually after install."
  fi

else
  echo "\nNo package.json or requirements.txt found in $BACK_DIR. Skipping backend install/start."
fi

# --- Widget (frontend) install & run ---
if [ -f "$WIDGET_DIR/package.json" ]; then
  echo "\nInstalling widget (frontend) modules..."
  (cd "$WIDGET_DIR" && npm install)

  # Prefer electron script if present
  if (cd "$WIDGET_DIR" && npm run | grep -q " electron"); then
    echo "Running 'npm run electron' (Electron)"
    (cd "$WIDGET_DIR" && npm run electron)
  else
    echo "Starting widget (npm run start) in foreground. Press Ctrl+C to stop."
    (cd "$WIDGET_DIR" && npm run start)
  fi
else
  echo "\nNo package.json in widget dir ($WIDGET_DIR). Cannot install/start widget."
fi

echo "\nDone."
