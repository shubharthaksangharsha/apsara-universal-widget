COMMIT_MESSAGE.md

## Version 1.0.0 - Initial Production Release 🚀

### Major Features

**Complete Voice Assistant System**
- React-based widget with real-time voice interaction using Google Gemini 2.0 Flash Experimental
- Electron desktop app for Linux with frameless, transparent, always-on-top widget
- Node.js WebSocket backend server with Gemini Live API integration
- Real-time audio streaming and processing with Web Audio API

### Frontend (React + Electron)

**Core Functionality:**
- ✅ Real-time voice chat with ultra-low latency (200-400ms)
- ✅ Interrupt capability - can interrupt Apsara at any time
- ✅ Smart muting system - mute mic without disconnecting
- ✅ Dynamic dual-analyser audio visualization
- ✅ Auto-switching between local and production backends

**Desktop Widget (Electron):**
- ✅ Frameless, transparent window (580x120px)
- ✅ Always-on-top, draggable widget panel
- ✅ Bottom-right corner positioning on launch
- ✅ Close button with proper IPC communication
- ✅ Complete app exit with --kill-others flag
- ✅ No sandbox issues (configured for Linux)
- ✅ Clickable controls while maintaining drag functionality

**Audio Visualization:**
- ✅ Dual-analyser system (microphone + playback)
- ✅ User speaking: Green/Gold gradient bars (standard amplitude)
- ✅ Apsara speaking: Dramatic orange spikes (2.5x larger, zero-smoothing)
- ✅ Speech-frequency-focused for AI responses
- ✅ Real-time updates using refs to avoid React closure issues
- ✅ Smart muting preserves Apsara's visualizer

**UI/UX:**
- ✅ Clean, modern circular visualizer design
- ✅ Status indicators (Connecting, Listening, Speaking, etc.)
- ✅ Mute button (only works when connected)
- ✅ Start/End button (dual-purpose toggle)
- ✅ Placeholder screen share and video icons
- ✅ Close button at top-right corner (Electron only)
- ✅ Smooth animations and transitions
- ✅ Mobile-responsive design

### Backend (Node.js + WebSocket)

**Server Features:**
- ✅ WebSocket proxy for Gemini Live API
- ✅ Secure API key management
- ✅ CORS configuration for authorized origins
- ✅ Email integration via Nodemailer (Gmail)
- ✅ Google Search integration for real-time info
- ✅ Custom system prompt for Apsara personality
- ✅ Robust error handling and logging

**Environment Configuration:**
- ✅ .env file support for sensitive data
- ✅ Configurable port (default: 3000)
- ✅ Optional email service setup
- ✅ Production-ready deployment setup

### Technical Improvements

**State Management:**
- ✅ useRef hooks for real-time audio processing
- ✅ Avoided stale state issues in callbacks
- ✅ Proper cleanup on unmount
- ✅ Memory leak prevention

**Audio Processing:**
- ✅ Fixed mute logic using refs instead of state
- ✅ Separate analysers for mic and playback
- ✅ Zero-smoothing for instant Apsara visualization
- ✅ 128 FFT size for balance between detail and speed
- ✅ Speech-frequency sampling for better reactivity

**Electron Optimizations:**
- ✅ Sandbox disabled for Linux SUID compatibility
- ✅ Transparent background (no colored rectangles)
- ✅ Proper window closing with app.quit()
- ✅ IPC communication for close button
- ✅ Development mode with hot reload

### Documentation

- ✅ Comprehensive README with all setup instructions
- ✅ Backend setup guide with environment variables
- ✅ Troubleshooting section for common issues
- ✅ Development journey documentation
- ✅ Customization guide for colors and settings
- ✅ Architecture and technology stack explanation
- ✅ .gitignore file for clean repository

### Files Changed

**Created:**
- `apsara-widget-app/` - Complete React + Electron app
  - `src/components/ApsaraWidget.js` - Main widget component
  - `src/components/ApsaraWidget.css` - Widget styles
  - `public/electron.js` - Electron main process
  - `package.json` - Dependencies and scripts
- `backend/server.js` - WebSocket backend server
- `backend/package.json` - Backend dependencies
- `backend/env-template.txt` - Environment variable template
- `README.md` - Comprehensive documentation
- `.gitignore` - Git ignore rules

**Modified:**
- Various configuration files for production readiness
- CORS settings for cross-origin support
- Package scripts for easy development and deployment

### Breaking Changes

None - this is the initial production release.

### Migration Notes

If migrating from the original HTML/JS widget:
1. Install dependencies in both `apsara-widget-app/` and `backend/`
2. Set up `.env` file in `backend/` with your Gemini API key
3. Run backend server: `cd backend && npm start`
4. Run widget: `cd apsara-widget-app && npm run electron`

### Known Issues

- Windows and macOS desktop apps not yet packaged (coming in v1.1)
- Screen share and video buttons are placeholders (coming in v1.1)

### Credits

Built with ❤️ by Shubharthak Sangharsha

**Technologies Used:**
- React 19.2.3
- Electron 39.2.7
- Node.js with Express
- Google Gemini 2.0 Flash Experimental
- Web Audio API
- WebSocket (ws library)

---

**Full Changelog:** Initial Release (v1.0.0)
**Release Date:** December 23, 2024
