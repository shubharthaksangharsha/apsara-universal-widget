# Apsara AI - Release Notes

## Version 1.0.0 (December 23, 2024)

### 🎉 Initial Production Release

The first complete, production-ready release of Apsara AI Voice Assistant!

### ✨ What's New

**Complete Voice Assistant System:**
- Real-time voice chat with Google Gemini 2.0 Flash Experimental
- Beautiful React widget with circular audio visualizer
- Electron desktop app for Linux
- Node.js WebSocket backend server

**Key Features:**
- 🎙️ Ultra-low latency voice interaction (200-400ms)
- 🔊 Dynamic audio visualization with dual-analyser system
- 💬 Interrupt Apsara at any time
- 🔇 Smart muting without disconnecting
- 🖥️ Floating, draggable desktop widget
- 📱 Mobile-responsive web interface

**Desktop Widget (Linux):**
- Frameless, transparent window
- Always-on-top functionality
- Bottom-right corner positioning
- Draggable panel with clickable controls
- Close button for complete app exit

**Audio Visualization:**
- Green/Gold bars for user speech
- Dramatic orange spikes for Apsara (2.5x larger!)
- Speech-frequency-focused sampling
- Zero-smoothing for instant response
- Preserved during mute mode

**Backend Server:**
- WebSocket proxy for Gemini Live API
- Email integration via Gmail
- Google Search for real-time info
- Environment-based configuration
- Production-ready deployment

### 📦 Installation

```bash
# Frontend
cd apsara-widget-app
npm install
npm run electron

# Backend
cd backend
npm install
npm start
```

### 🔧 Configuration

See README.md for detailed setup instructions and environment variables.

### 🐛 Bug Fixes

- Fixed mute button triggering unwanted connections
- Resolved transparent background issues (no purple rectangle)
- Fixed Electron sandbox errors on Linux
- Corrected audio processing stale state issues
- Ensured complete app exit when closing widget

### 📝 Documentation

- Comprehensive README with setup guides
- Backend configuration instructions
- Troubleshooting section
- Development journey documentation
- Customization guides

### 🎯 Coming in v1.1

- Screen share functionality
- Video chat capability
- Conversation history
- Windows and macOS desktop installers

### 💖 Acknowledgments

Special thanks to Google for the amazing Gemini AI model!

---

**Download:** Clone from repository
**Documentation:** See README.md
**Support:** Open an issue on GitHub
