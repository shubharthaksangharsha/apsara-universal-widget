# Apsara AI - Voice Assistant System 🎙️✨

**Version 1.0.0** - Complete Production Release

A complete voice assistant system powered by Google's Gemini 2.5 Flash Experimental AI, featuring a beautiful React widget, Electron desktop app, and Node.js backend with WebSocket communication.

![Apsara Widget](https://img.shields.io/badge/React-19.2.3-61dafb?logo=react)
![Electron](https://img.shields.io/badge/Electron-39.2.7-47848f?logo=electron)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

### Voice Interaction
- **Real-time Voice Chat**: Talk naturally to Apsara AI with ultra-low latency streaming
- **Interrupt Capability**: Interrupt Apsara at any time to ask follow-up questions
- **Smart Muting**: Mute your microphone while still seeing Apsara's responses
- **Dynamic Visualizer**: Beautiful audio visualization that changes based on who's speaking
  - 🟢 **Green/Gold bars** when you speak
  - 🟠 **Dramatic orange spikes** when Apsara speaks

### What Apsara Can Do
Apsara is powered by Google's Gemini 2.0 Flash Experimental model with real-time voice capabilities:

- **Answer Questions**: Get instant answers about any topic
- **Have Conversations**: Natural, flowing conversations with context awareness
- **Real-time Google Search**: Automatic access to current events, news, weather, sports, latest tech updates
- **Send Email**: Can send messages to Shubharthak via email
- **Help with Tasks**: Assistance with planning, problem-solving, and decision-making
- **Creative Support**: Help with writing, brainstorming, and creative projects
- **Real-time Interaction**: Ultra-low latency responses (typically 200-400ms)

### Platform Support
- ✅ **Web Browser**: Works in any modern browser (Chrome, Firefox, Safari, Edge)
- ✅ **Linux Desktop**: Native desktop widget with Electron (fully functional)
- 🔄 **Windows Desktop**: Native desktop widget with Electron (coming soon)
- 🔄 **macOS Desktop**: Native desktop widget with Electron (coming soon)

### Desktop Widget Features (Electron)
- **Frameless Window**: Transparent, borderless window showing only the widget
- **Always-on-Top**: Stays visible above all other windows
- **Draggable Widget**: Click and drag the widget panel to move it anywhere
- **Clickable Controls**: All buttons remain fully functional while dragging
- **Close Button**: Red X button at top-right corner to exit the app
- **Auto-Exit**: Properly closes both Electron and React dev server when closed
- **No Sandbox Issues**: Configured to run without SUID sandbox errors on Linux
- **Bottom-Right Position**: Automatically positions in bottom-right corner on launch
- **Compact Size**: 580x120px window perfectly sized for the widget

### User Interface
- **Dynamic Audio Visualizer**: Real-time visualization with different colors for user and AI
  - 🟢 **Green/Gold bars** (user speaking) - Standard amplitude
  - 🟠 **Dramatic orange spikes** (Apsara speaking) - 2.5x larger, zero-smoothing, instant response
  - Speech-frequency-focused for more reactive Apsara visualization
- **Smart Mute**: Mute button only works when connected, doesn't auto-connect
- **Status Indicators**: Clear visual feedback for connection, listening, and speaking states
- **Responsive Design**: Works on desktop and mobile devices
- **Smooth Animations**: Professional transitions and hover effects
- **Placeholder Icons**: Screen share and video cam buttons (coming soon)

## 📦 Project Structure

```
apsara_ai/
├── apsara-widget-app/       # Frontend React + Electron Widget
│   ├── public/
│   │   ├── electron.js      # Electron main process
│   │   ├── index.html       # HTML template
│   │   └── manifest.json    # Web app manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApsaraWidget.js  # Main widget component
│   │   │   └── ApsaraWidget.css # Widget styles
│   │   ├── App.js           # Root component
│   │   └── index.js         # Entry point
│   └── package.json         # Frontend dependencies
│
├── backend/                 # Backend WebSocket Server
│   ├── server.js            # Main server file
│   ├── package.json         # Backend dependencies
│   └── .env                 # Environment variables
│
├── widget.js                # Original HTML/JS widget
├── widget.css               # Original widget styles
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Google Gemini API key ([Get it here](https://aistudio.google.com/app/apikey))

### Option 1: Web Browser (Easiest - Frontend Only)

1. **Navigate to Widget App**
   ```bash
   cd apsara-widget-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Open in Browser**
   - Automatically opens at `http://localhost:3001`
   - Click the widget to start talking to Apsara
   - Allow microphone access when prompted

### Option 2: Full Stack (Frontend + Backend)

#### Backend Setup

1. **Navigate to Backend**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create .env File**
   ```bash
   cp env-template.txt .env
   ```

4. **Configure Environment Variables**
   
   Edit `.env` file:
   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   
   # Optional (for email functionality)
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_app_password
   ```

5. **Start Backend Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🚀 Apsara Live Backend running on port 3000
   📧 Email service configured
   ```

#### Frontend Setup

1. **Open New Terminal and Navigate to Widget App**
   ```bash
   cd apsara-widget-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Frontend**
   ```bash
   npm start
   ```

Now the widget will connect to your local backend at `ws://localhost:3000`!

### Option 3: Desktop Widget (Linux - Production Ready!)

**Prerequisites:**
- Completed Backend Setup (from Option 2) OR use production backend
- Node.js 16+ and npm

**Steps:**

1. **Navigate to Widget App**
   ```bash
   cd apsara-widget-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Electron Widget (Development Mode)**
   ```bash
   npm run electron
   ```
   
   This will:
   - Start the React dev server on port 3001
   - Launch Electron desktop widget
   - Auto-connect to backend (local or production)
   - Show widget in bottom-right corner

4. **Using the Widget**
   - The widget appears as a floating, always-on-top window
   - Drag the widget panel to move it anywhere on screen
   - Click to start talking to Apsara
   - Use the close button (X) to exit completely

**Note:** For production build:
```bash
npm run build        # Build React app
npm run electron-build  # Package as desktop app
```

#### Linux Desktop Integration (Optional)

```bash
# Create desktop launcher
cat > ~/.local/share/applications/apsara-widget.desktop << 'EOF'
[Desktop Entry]
Name=Apsara AI Widget
Comment=Voice Assistant Widget
Exec=/path/to/apsara_ai/apsara-widget-app/node_modules/.bin/electron /path/to/apsara_ai/apsara-widget-app/public/electron.js
Icon=/path/to/apsara_ai/apsara-widget-app/public/logo192.png
Type=Application
Categories=Utility;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

## 🎨 How to Use

### Starting a Conversation

1. **Click the Widget**: Click anywhere on the widget panel to connect
2. **Wait for "Listening..."**: The widget will show when it's ready
3. **Start Talking**: Simply speak your question or request
4. **Listen to Response**: Apsara will respond with voice

### Widget Controls

| Button | Function | Description |
|--------|----------|-------------|
| 🎤 **Mute** | Mute/Unmute Microphone | Stops your audio from being sent (Apsara can still speak) |
| 📺 **Screen Share** | Share Screen | Coming soon - share your screen with Apsara |
| 📹 **Video** | Toggle Video | Coming soon - enable video chat |
| ❌ **End** | End/Start Call | Ends the current session or starts a new one |
| ✖️ **Close** | Close Widget | Closes the desktop widget (Electron only) |

### Visual Indicators

- **Green/Gold Bars**: You are speaking
- **Orange Bars**: Apsara is speaking (more dramatic spikes!)
- **No Bars**: Muted or idle
- **Status Text**: Shows current state (Connecting, Listening, Speaking, etc.)

### Interrupt Feature

You can interrupt Apsara at any time while she's speaking:
- Just start talking, and Apsara will stop and listen to you
- Perfect for follow-up questions or corrections

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18.3.1
- Electron (for desktop widget)
- Web Audio API for real-time audio processing
- WebSocket client for backend communication
- Modern CSS with animations

**Backend:**
- Node.js with Express
- WebSocket (ws library) for real-time communication
- Google Gemini 2.0 Flash Experimental API
- Nodemailer for email functionality
- CORS enabled for cross-origin requests

**AI & Services:**
- Google Gemini 2.0 Flash Experimental with Multimodal Live API
- Google Search integration for real-time information
- Email integration via Gmail SMTP

### Communication Flow

```
User (Browser/Electron)
    ↕ WebSocket
Backend Server (Node.js)
    ↕ WebSocket
Google Gemini Live API
    → Google Search (when needed)
    → Email Service (when needed)
```

### Backend Features

The backend server (`backend/server.js`) provides:

1. **WebSocket Proxy**: Secure connection between frontend and Gemini API
2. **API Key Management**: Keeps your Gemini API key secure on the server
3. **CORS Configuration**: Allows requests from authorized origins
4. **Email Integration**: Send messages via Nodemailer
5. **Google Search**: Automatic real-time information retrieval
6. **System Prompt**: Custom personality and capabilities for Apsara
7. **Error Handling**: Robust error handling and logging

### Environment Variables

The backend uses these environment variables (set in `.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key |
| `PORT` | No | Server port (default: 3000) |
| `EMAIL_USER` | No | Gmail address for sending emails |
| `EMAIL_APP_PASSWORD` | No | Gmail app password for SMTP |

## 🔧 Development

### Available Scripts

**Frontend (apsara-widget-app/):**
```bash
npm start          # Start development server (web browser)
npm run build      # Build for production
npm run electron   # Start Electron desktop widget
npm test           # Run tests
```

**Backend (backend/):**
```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
```

### Development Tips

1. **Frontend Development**: Use `npm start` in `apsara-widget-app/` for hot reload
2. **Backend Development**: Use `npm run dev` in `backend/` for auto-restart
3. **Full Stack**: Run both frontend and backend in separate terminals
4. **Debug Mode**: 
   - Frontend: Open browser DevTools (F12)
   - Backend: Check server logs in terminal
   - Electron: Press Ctrl+Shift+I for DevTools

### Backend API Endpoints

- **WebSocket**: `ws://localhost:3000` (or your configured port)
  - Handles bidirectional audio streaming
  - Receives audio from frontend
  - Sends Gemini responses back
  - Manages session state

### Customization

#### Change Backend Port

Edit `backend/.env`:
```env
PORT=3000  # Change to any available port
```

Also update frontend WebSocket URL in `apsara-widget-app/src/components/ApsaraWidget.js`:
```javascript
const BACKEND_WS_URL = window.location.hostname === 'localhost'
    ? 'ws://localhost:3000'  // Update port here
    : 'wss://your-production-backend.com';
```

#### Customize Apsara's Personality

Edit `backend/server.js` and modify the `SYSTEM_PROMPT` variable to change Apsara's behavior, knowledge, and personality.

#### Change Widget Size/Position (Electron)

Edit `apsara-widget-app/public/electron.js`:
```javascript
const mainWindow = new BrowserWindow({
  width: 450,                  // Change width
  height: 120,                 // Change height
  x: screenWidth - 470,        // Change X position
  y: screenHeight - 140,       // Change Y position
  // ... other options
});
```

#### Change Visualizer Colors

Edit `apsara-widget-app/src/components/ApsaraWidget.js`:
```javascript
// User speaking colors
gradient.addColorStop(0, '#FFD700');   // Gold
gradient.addColorStop(0.5, '#FFA500'); // Orange
gradient.addColorStop(1, '#32CD32');   // Green

// Apsara speaking colors
gradient.addColorStop(0, '#e8832a');   // Orange
gradient.addColorStop(0.5, '#f5a54a'); // Light Orange
gradient.addColorStop(1, '#d46e1a');   // Dark Orange
```

## 🐛 Troubleshooting

### Backend Issues

**Server won't start:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Make sure `.env` file exists with valid `GEMINI_API_KEY`
- Check Node.js version: `node --version` (should be 16+)

**WebSocket connection failed:**
- Verify backend is running: check for "Backend running on port 3000" message
- Check firewall settings
- Verify CORS origins in `backend/server.js` include your frontend URL

**Gemini API errors:**
- Verify your API key is valid
- Check API quota at [Google AI Studio](https://aistudio.google.com/)
- Ensure you have access to Gemini 2.0 Flash Experimental

**Email not sending:**
- Verify `EMAIL_USER` and `EMAIL_APP_PASSWORD` are set correctly
- Use Gmail App Password, not regular password
- Enable 2FA and generate app password at [Google Account](https://myaccount.google.com/apppasswords)

### Frontend Issues

**Microphone not working:**
- Check browser microphone permissions
- Linux: Check `pavucontrol` or `alsamixer`
- Chrome: Go to `chrome://settings/content/microphone`

**No audio from Apsara:**
- Check speaker/headphone volume
- Check browser audio settings
- Look for errors in console (F12)

**Connection errors:**
- Make sure backend server is running
- Check WebSocket URL in `ApsaraWidget.js`
- Look for CORS errors in console

**Desktop widget not appearing:**
- Run `npm run build` first
- Check if Electron is installed: `npm list electron`
- Try running with debug: `npm run electron`

**Visualizer not showing:**
- Check console for audio analyser errors
- Verify microphone permission granted
- Look for audio debug logs

## 📝 Development Journey

### Phase 1: Web Widget Foundation
- ✅ Created original HTML/CSS/JS widget
- ✅ Integrated with Gemini Live API
- ✅ Built WebSocket backend server
- ✅ Implemented audio streaming

### Phase 2: React Migration
- ✅ Ported widget to React
- ✅ Set up component architecture
- ✅ Implemented state management
- ✅ Created circular audio visualizer

### Phase 3: Desktop Widget
- ✅ Integrated Electron
- ✅ Made frameless, transparent window
- ✅ Added always-on-top functionality
- ✅ Positioned widget in bottom-right corner
- ✅ Added draggable panel
- ✅ Implemented IPC for close button

### Phase 4: Enhanced Audio Visualization
- ✅ Dual-analyser system (mic + playback)
- ✅ Dynamic color switching (user vs Apsara)
- ✅ Zero-smoothing for dramatic Apsara spikes
- ✅ Speech-frequency-focused visualization
- ✅ Smart muting (preserves Apsara's visualizer)

### Phase 5: UI/UX Polish
- ✅ Always-visible mute and end buttons
- ✅ Smart button behavior (Start/End toggle)
- ✅ Fixed mute button to only handle muting (no auto-connect)
- ✅ Real-time state tracking with refs
- ✅ Smooth animations and transitions
- ✅ Added placeholder screen share and video icons
- ✅ Increased widget width to fit all controls

### Phase 6: Electron Optimization
- ✅ Fixed transparent background (no purple rectangle)
- ✅ Close button at top-right corner
- ✅ Disabled sandbox for Linux compatibility
- ✅ Proper app quit with `--kill-others` flag
- ✅ Complete cleanup when window closes
- ✅ Production-ready Electron setup

### Phase 7: Cross-Platform Support
- ✅ Auto-switching between local and production backends
- ✅ Mobile-responsive design
- ✅ Desktop integration for Linux
- ✅ Comprehensive documentation
- ✅ Version 1.0 release ready!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create feature branch (`git checkout -b feature/amazing-feature`)
4. Make your changes
5. Test thoroughly (frontend + backend)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini**: For the incredible AI model and Live API
- **React**: For the powerful UI framework
- **Electron**: For cross-platform desktop support
- **Node.js**: For the robust backend runtime
- **Web Audio API**: For real-time audio processing
- **Community**: For all the support and feedback

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Look for similar issues in console logs (frontend & backend)
3. Verify environment variables are set correctly
4. Check that both frontend and backend are running
5. Open an issue on GitHub with:
   - Detailed description
   - Steps to reproduce
   - Console logs (frontend & backend)
   - Environment info (OS, Node version, etc.)

## 🎯 Roadmap

### Version 1.0 (Completed! 🎉)
- ✅ React widget with Gemini Live API
- ✅ Electron desktop app for Linux
- ✅ WebSocket backend server
- ✅ Real-time audio visualization
- ✅ Dual-analyser system for user and AI
- ✅ Smart muting and controls
- ✅ Draggable, transparent widget
- ✅ Complete documentation

### Version 1.1 (Next Release)
- [ ] Screen share functionality
- [ ] Video chat capability
- [ ] Conversation history panel
- [ ] Export conversations to file
- [ ] Customizable themes

### Version 2.0 (Future)
- [ ] Windows desktop installer (.exe)
- [ ] macOS desktop installer (.dmg)
- [ ] Mobile apps (iOS/Android)
- [ ] Custom wake word detection
- [ ] Voice settings (speed, pitch, language)
- [ ] Multi-language support
- [ ] Keyboard shortcuts
- [ ] System tray integration
- [ ] Auto-start on boot option

---

**Built with ❤️ by Shubharthak Sangharsha**

*Powered by React, Electron, Node.js, and Google Gemini AI*

**Version 1.0.0** - December 2024

*Talk to Apsara - Your Intelligent Voice Assistant*
- [ ] Multi-language support
- [ ] Voice settings (speed, pitch, language)

### Long Term
- [ ] Custom themes and backgrounds
- [ ] Keyboard shortcuts
- [ ] Plugin system
- [ ] Multi-user support
- [ ] Cloud sync
- [ ] Advanced analytics

---

**Built with ❤️ using React, Electron, Node.js, and Google Gemini AI**

*Talk to Apsara - Your AI Voice Assistant*

🌐 [Production Demo](https://apsara-devshubh.devshubh.me) | 📧 [Contact](mailto:shubharthaksangharsha@gmail.com)
