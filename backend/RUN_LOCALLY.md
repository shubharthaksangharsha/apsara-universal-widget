# 🚀 Running Apsara Backend Locally

## Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd /home/shubharthak/Desktop/myapsara/src/apsara_ai/apsara-live/backend
npm install
```

### Step 2: Create .env File
```bash
cp .env.example .env
```

### Step 3: Add Your Gemini API Key
1. Get your API key from: https://aistudio.google.com/app/apikey
2. Open `.env` file
3. Replace `your_gemini_api_key_here` with your actual API key

Example `.env`:
```
GEMINI_API_KEY=AIzaSyC_your_actual_key_here
PORT=3000
```

### Step 4: Start the Server
```bash
npm start
```

Or for development (auto-restart on changes):
```bash
npm run dev
```

You should see:
```
🚀 Apsara Live Backend running on port 3000
📧 Email service configured for: shubharthaksangharsha@gmail.com
```

### Step 5: Update Flutter App to Use Localhost

The Flutter app will automatically connect to `ws://localhost:3000` when running locally.

---

## Testing the Backend

Once the server is running, you can test it:

### 1. Check Health Endpoint
```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","service":"Apsara Live Backend"}
```

### 2. WebSocket Connection
The Flutter app will connect to: `ws://localhost:3000`

---

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

Then update Flutter app to use the new port.

### Missing Dependencies
```bash
npm install
```

### API Key Not Working
- Make sure you copied the full key (starts with `AIza...`)
- Check you're using the correct project in Google AI Studio
- Make sure the Gemini API is enabled for your project

---

## Email Function (Optional)

If you want the `send_email_to_shubharthak` function to work:

1. Enable 2-Step Verification on your Gmail
2. Get an App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your_16_char_app_password
```

---

## Production vs Development

**Development (Local):**
- Backend: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`
- Fast iteration
- Easy debugging

**Production (Oracle Server):**
- Backend: `https://apsara-devshubh.devshubh.me`
- WebSocket: `wss://apsara-devshubh.devshubh.me`
- Public access
- Always online

Switch between them by changing the WebSocket URL in Flutter app.
