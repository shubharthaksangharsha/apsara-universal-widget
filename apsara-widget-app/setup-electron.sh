#!/bin/bash

# Apsara Widget - Electron Setup Script
# This script sets up the necessary dependencies for building a desktop app

echo "🚀 Setting up Apsara Widget Desktop App..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the apsara-widget-app directory."
    exit 1
fi

echo "📦 Installing Electron dependencies..."
npm install --save-dev electron electron-builder electron-is-dev concurrently wait-on cross-env

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
