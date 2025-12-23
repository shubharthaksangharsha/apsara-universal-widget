#!/usr/bin/env bash
set -euo pipefail

# macOS-specific helper (very similar to run-all.sh). Use this when running on macOS.
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

echo "macOS helper: installing and running backend + widget"

# Check for required system dependencies on macOS
echo "\n🔍 Checking macOS system dependencies..."
# macOS has built-in tools: screencapture, pbcopy, pbpaste, osascript
# These are all part of macOS by default, so just verify they exist
if command -v screencapture &> /dev/null && command -v pbcopy &> /dev/null && command -v osascript &> /dev/null; then
  echo "✅ All macOS system tools found (screencapture, pbcopy, osascript)!"
else
  echo "⚠️  WARNING: Some macOS system tools are missing. This is unusual."
  echo "Make sure you're running on a standard macOS installation."
  sleep 3
fi

if [ ! -f "$BACK_DIR/.env" ]; then
  if [ -f "$BACK_DIR/.env.example" ]; then
    echo "'.env' not found in $BACK_DIR. Copying from .env.example..."
    cp "$BACK_DIR/.env.example" "$BACK_DIR/.env"
    echo "Copied .env.example -> .env (please verify secrets/keys)."
  else
    echo "ERROR: .env not found in $BACK_DIR. Please create it before proceeding."
    exit 2
  fi
fi

if [ -f "$BACK_DIR/package.json" ]; then
  (cd "$BACK_DIR" && npm install)
  (cd "$BACK_DIR" && nohup npm run start > "$BACK_DIR/back.log" 2>&1 &)
elif [ -f "$BACK_DIR/requirements.txt" ]; then
  python3 -m venv "$BACK_DIR/.venv" || python -m venv "$BACK_DIR/.venv"
  # shellcheck source=/dev/null
  source "$BACK_DIR/.venv/bin/activate"
  pip install --upgrade pip
  pip install -r "$BACK_DIR/requirements.txt"
  if [ -f "$BACK_DIR/app.py" ]; then
    (cd "$BACK_DIR" && nohup python app.py > "$BACK_DIR/back.log" 2>&1 &)
  else
    echo "No Python entrypoint found; start backend manually."
  fi
else
  echo "No backend package file found; skipping backend."
fi

if [ -f "$WIDGET_DIR/package.json" ]; then
  (cd "$WIDGET_DIR" && npm install)
  # Prefer electron if defined
  if (cd "$WIDGET_DIR" && npm run | grep -q " electron"); then
    (cd "$WIDGET_DIR" && npm run electron)
  else
    (cd "$WIDGET_DIR" && npm run start)
  fi
else
  echo "No widget package.json found in $WIDGET_DIR."
fi

echo "Done."
