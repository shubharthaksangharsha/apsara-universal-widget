#!/usr/bin/env bash

# Apsara Widget - Electron Setup Script
# This script sets up the necessary dependencies for building a desktop app

set -euo pipefail

echo "🚀 Setting up Apsara Widget Desktop App..."
echo ""

# If run from repository root, switch to apsara-widget-app
if [ ! -f "package.json" ]; then
    if [ -f "apsara-widget-app/package.json" ]; then
        cd "apsara-widget-app"
    else
        echo "❌ Error: package.json not found. Please run this script from the apsara-widget-app directory or repo root."
        exit 1
    fi
fi

echo "Working in: $(pwd)"

echo "📦 Installing Electron dependencies (dev)..."
# Install core electron build deps as devDependencies
npm install --save-dev electron electron-builder electron-is-dev concurrently wait-on cross-env || {
    echo "npm install failed — try running with elevated permissions or inspect npm output." >&2
    exit 1
}

echo "📦 Installing regular dependencies (if any)"
npm install || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Available commands:" 
echo "   npm start           - Run as web app (localhost:3000)"
echo "   npm run electron    - Run as desktop app"
echo "   npm run build       - Build for production"
echo "   npm run dist        - Build desktop installer"
echo ""
echo "🎉 You can now run: npm run electron"
