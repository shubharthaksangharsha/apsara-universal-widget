/**
 * Apsara Live - Backend Server for Oracle Hosting
 * This server acts as a secure proxy between your frontend and Gemini Live API
 */

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug logging toggle
const DEBUG_LOG = true; // Set to false to disable debug logging

// Debug log helper - only logs when DEBUG_LOG is true
const debugLog = (...args) => {
  if (DEBUG_LOG) console.log(...args);
};

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Update this with your GitHub Pages URL
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',        // React app (if on 3000)
    'http://127.0.0.1:3000',        // React app (if on 3000)
    'http://localhost:3001',        // React app (new port)
    'http://127.0.0.1:3001',        // React app (new port)
    'https://shubharthaksangharsha.github.io', // UPDATE THIS!
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Email configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use App Password, not regular password
    }
});

// Function to send email
async function sendEmailToShubharthak(message, userContext = '') {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'shubharthaksangharsha@gmail.com',
            subject: `Message from Apsara Live Assistant`,
            html: `
                <h2>New message from Apsara Live</h2>
                <p><strong>Message:</strong> ${message}</p>
                ${userContext ? `<p><strong>Context:</strong> ${userContext}</p>` : ''}
                <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
            `
        };

        const info = await emailTransporter.sendMail(mailOptions);
        debugLog('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

// System prompt with all your data
const SYSTEM_PROMPT = `You are Apsara, an advanced AI voice assistant created by Shubharthak Sangharasha. You are friendly, helpful, and conversational. When greeting users or introducing yourself, be warm and professional.

**Your Capabilities:**
- Real-time voice conversations with natural interruption handling
- Sending messages to Shubharthak via email
- Searching Google for real-time information (current events, news, weather, sports, latest tech updates, etc.)
- Answering questions about Shubharthak's work, projects, and experience
- Providing information about his skills, education, and background
- Discussing his freelance work and client projects
- Explaining his technical expertise in detail


**How to interact with users:**
- Be conversational and friendly
- Respond only in English until user dont want to speak in other language
- Answer questions naturally about Shubharthak's experience and projects
- If someone wants to contact Shubharthak, offer to send a message via email
- Provide detailed but concise information
- Show enthusiasm about the projects and work
- For questions about current events, news, weather, sports scores, latest tech updates, or anything requiring real-time information, Google Search will automatically provide accurate, up-to-date answers
- Always cite sources when sharing information from Google Search

**Important:** 
- When users ask you to send a message to Shubharthak, use the send_email_to_shubharthak function.
- Google Search is available for real-time information - the system will handle it automatically when needed.*/
**About Shubharthak Sangharasha:**


**Professional Summary:**
Software Engineer and AI/ML Specialist with expertise in Full-Stack Development, Machine Learning, and Computer Vision. Currently pursuing Master of Artificial Intelligence and Machine Learning at University of Adelaide, Australia. Experienced freelance developer who has built professional websites and applications for various industries including construction, finance, and electrical services.

**Contact:**
- Email: shubharthaksangharsha@gmail.com
- GitHub: github.com/shubharthaksangharsha
- LinkedIn: linkedin.com/in/shubharthak-sangharasha
- Website: devshubh.me

**Work Experience:**
1. **Backend Web Development Intern at Curve Tomorrow** (June 2022 - August 2022)
   - Melbourne, Australia
   - Implemented User Log System for auditing purposes
   - Added CMS (Content Management System) enabling admins to add/edit pages without developer involvement
   - Reduced turn-around time from days to minutes
   - Collaborated with global team members

**Education:**
- **Master of Artificial Intelligence and Machine Learning** - University of Adelaide, Adelaide, SA, Australia (2024 - Present)
  GPA: 6.14
- **B.E. in Computer Science and Engineering (AI/Machine Learning)** - Chandigarh University, Punjab, India (2020-2024)
  CGPA: 8.39
- **12th (Senior Secondary), CBSE Board** - NP Co-ed, Lodhi Estate, New Delhi (2018-2019)
  Percentage: 81.5%

**Skills:**
- **Programming Languages:** Python, Ruby, C, C++, Java, JavaScript
- **Web Development:** HTML, CSS, Flask, Ruby on Rails, React, Node.js, Express
- **Data Science:** NumPy, Pandas, OpenCV
- **Machine Learning:** TensorFlow, PyTorch, NLP, LLMs, LangChain, Scikit-learn, Keras, NLTK
- **Databases:** MySQL, MongoDB, PostgreSQL
- **Cloud & Tools:** AWS, Google Cloud, Git, Docker, Unix, Selenium
- **Specialized:** Big Data, Prompt Engineering, Computer Vision

**Featured Projects:**

1. **Karpathy** (Most Recent) - https://github.com/shubharthaksangharsha/karpathy
   - Jupyter Notebook
   - A comprehensive collection of machine learning and neural network implementations following Andrej Karpathy's 'Neural Networks: Zero to Hero' course
   - Contains hands-on implementations from basic neural networks to advanced transformer architectures
   - Educational ML implementations with detailed explanations

2. **Apsara 2.5** - https://apsara.devshubh.me (Live Demo)
   - JavaScript
   - Latest version of Apsara voice assistant with web interface
   - Real-time voice interactions and tool integration
   - Advanced AI-powered conversational capabilities

3. **Apsara 2.0** - https://github.com/shubharthaksangharsha/apsara2.0
   - Enhanced version of Apsara voice assistant with improved features

4. **ApsaraAI (Original)** - https://github.com/shubharthaksangharsha/apsaraAI
   - First version of the AI-powered voice assistant
   - Multiple integrations and voice commands

5. **Power Extension** - https://github.com/shubharthaksangharsha/power_extension
   - JavaScript
   - Gemini Clipboard Assistant - Chrome/Edge extension
   - Sends clipboard content or screenshots to Google's Gemini API
   - Keyboard shortcuts for quick access

6. **AI Website Generator** - https://github.com/shubharthaksangharsha/ai-website-generator
   - JavaScript
   - AI-powered website generation tool for automated web development

7. **Add2Calendar** - https://github.com/shubharthaksangharsha/add2calendar
   - Python
   - Calendar integration application for seamless scheduling

8. **American Sign Language Recognition** - https://github.com/shubharthaksangharsha/AmericanSIgnLanguage
   - Computer vision project for ASL recognition

9. **Volume Hand Controller** - https://github.com/shubharthaksangharsha/volume_hand_controller
   - Python
   - Control system volume using hand gestures with computer vision
   - Real-time gesture recognition

10. **Face Mask Detection using Transfer Learning** - https://github.com/shubharthaksangharsha/FaceMaskDetection_usingTransferLearning
    - Python
    - Face mask detection using transfer learning for COVID-19 safety

11. **RAG Implementation** - https://github.com/shubharthaksangharsha/rag_implemenetation
    - Retrieval-Augmented Generation system implementation

12. **LinkedIn Job Submitter** - https://github.com/shubharthaksangharsha/linkedin_job_submitter
    - Python
    - Automated LinkedIn job application submitter

13. **Face Attendance System** - https://github.com/shubharthaksangharsha/face_attendance_system
    - Python
    - Facial recognition-based attendance tracking system

14. **Voice-Based Email for Visually Challenged** - https://github.com/shubharthaksangharsha/Voice-Based-Email-for-Visually-Challenged
    - Python
    - Voice-controlled email system for accessibility

15. **Ruby Rails Friends** - https://github.com/shubharthaksangharsha/ruby_rails_friends
    - Ruby
    - Ruby on Rails friends management application

16. **Customer Segmentation Using RFM and K-Means** - https://github.com/shubharthaksangharsha/Customer_Segmentation_Using_RFM_and_K-Means
    - Jupyter Notebook
    - Customer segmentation using RFM analysis and K-Means clustering

17. **Handwritten Digit Recognition using SVM** - https://github.com/shubharthaksangharsha/Handwritten-Digit-Recognition-using-SVM-by-Shubharthak
    - Jupyter Notebook
    - Machine learning project for digit recognition

18. **Online Auction Java Servlet MySQL** - https://github.com/shubharthaksangharsha/Online-Auction-Java-Servlet-MySQL
    - Java
    - Online auction system built with Java Servlets and MySQL

19. **Car Price Linear Regression** - https://github.com/shubharthaksangharsha/car_price_linear_regression
    - Jupyter Notebook
    - Car price prediction using linear regression

20. **Presentation Controlling Using Hand Gesture** - https://github.com/shubharthaksangharsha/presentation_controlling_using_hand_gesture
    - Python
    - Control presentations using hand gestures and computer vision

21. **QR Barcode Scanner** - https://github.com/shubharthaksangharsha/qr_barcode_scanner
    - Python
    - QR code and barcode scanner application

22. **Object Detection Using YOLOv3 Classification** - https://github.com/shubharthaksangharsha/object_detection_using_yoloV3classification
    - Python
    - Real-time object detection using YOLOv3

23. **Virtual Calculator** - https://github.com/shubharthaksangharsha/virtualCalculator
    - Python
    - Virtual calculator with gesture controls

24. **Snake Game OpenCV** - https://github.com/shubharthaksangharsha/snakeGame_openCV
    - Python
    - Snake game controlled using OpenCV and hand tracking

25. **Eye Counter** - https://github.com/shubharthaksangharsha/eye-counter
    - Python
    - Eye blink counter using computer vision

26. **Face Depth Measurement** - https://github.com/shubharthaksangharsha/face-depth-measurement
    - Python
    - Face depth measurement system using computer vision

27. **Tic Tac Toe** - https://github.com/shubharthaksangharsha/tictactoe
    - C++
    - Interactive Tic-Tac-Toe game

**Freelance Work:**
- W13 Projects (w13projects.com) - Premium construction website
- Auz Finance (auzfinance.com) - Finance broker platform
- BAAZ Electrical Group (baazelectrical.github.io) - Electrical services site`;

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (clientWs) => {
    debugLog('Client connected');
    let geminiWs = null;
    let currentModality = 'AUDIO'; // Track current modality

    // Connect to Gemini Live API with specific modality
    const connectToGemini = async (modality = 'AUDIO') => {
        debugLog(`🔄 Connecting to Gemini Live API with modality: ${modality}...`);
        
        // Close existing connection if any and WAIT for it to fully close
        if (geminiWs) {
            debugLog('🔌 Closing existing Gemini connection...');
            try {
                geminiWs.close();
                // Wait for the old session to fully close (500ms to ensure clean shutdown)
                await new Promise(resolve => setTimeout(resolve, 500));
                debugLog('⏱️  Old session closed');
            } catch (e) {
                console.error('Error closing old session:', e);
            }
            geminiWs = null;
        }
        
        const { GoogleGenAI, Modality } = await import('@google/genai');
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = 'gemini-2.5-flash-native-audio-preview-12-2025'; // Use half-cascade for better tool support
        debugLog('📡 Using model:', model);
        
        // Function declarations for tools
        const tools = [
            // Google Search - Built-in tool (no function declaration needed)
            { googleSearch: {} },
            // Custom function for sending emails
            {
                functionDeclarations: [
                    {
                        name: 'send_email_to_shubharthak',
                        description: 'Send an email message to Shubharthak Sangharasha. Use this when users want to contact him, leave a message, or send inquiries.',
                        parameters: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'The message content to send to Shubharthak'
                                },
                                senderInfo: {
                                    type: 'string',
                                    description: 'Optional information about the sender (name, contact info if provided)'
                                }
                            },
                            required: ['message']
                        }
                    }
                ]
            }
        ];

        // Set response modalities based on selected mode
        const responseModalities = modality === 'AUDIO' 
            ? [Modality.AUDIO] 
            : [Modality.TEXT];

        // Build config differently for AUDIO vs TEXT to avoid audio-related fields in TEXT mode
        const config = modality === 'AUDIO' ? {
            responseModalities: responseModalities,
            systemInstruction: SYSTEM_PROMPT,
            tools: tools,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: 'Aoede' // Friendly female voice
                    }
                }
            }
        } : {
            // TEXT mode - no audio/speech config at all
            responseModalities: responseModalities,
            systemInstruction: SYSTEM_PROMPT,
            tools: tools
        };

        debugLog('🔧 Session config:', { 
            modality, 
            responseModalities: responseModalities.map(m => m === Modality.AUDIO ? 'AUDIO' : 'TEXT'),
            hasSpeechConfig: !!config.speechConfig,
            configKeys: Object.keys(config)
        });

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: () => {
                    debugLog('Connected to Gemini');
                    clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
                },
                onmessage: async (message) => {
                    debugLog('📨 Received message from Gemini:', JSON.stringify(Object.keys(message)));
                    
                    // Extract audio from serverContent.inlineData - ONLY in AUDIO mode
                    let audioData = null;
                    let textData = null;
                    
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            // Extract audio in AUDIO mode
                            if (currentModality === 'AUDIO' && part.inlineData) {
                                if (part.inlineData.mimeType && part.inlineData.mimeType.includes('audio')) {
                                    audioData = part.inlineData.data;
                                    debugLog('🔊 AUDIO DATA LENGTH:', audioData.length);
                                }
                            }
                            // Extract text in TEXT mode
                            if (currentModality === 'TEXT' && part.text) {
                                textData = part.text;
                                debugLog('📝 TEXT DATA:', textData.substring(0, 100));
                            }
                        }
                    }
                    
                    // Handle tool calls
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'send_email_to_shubharthak') {
                                const { message: emailMessage, senderInfo } = fc.args;
                                const result = await sendEmailToShubharthak(emailMessage, senderInfo);
                                
                                session.sendToolResponse({
                                    functionResponses: [{
                                        id: fc.id,
                                        name: fc.name,
                                        response: result
                                    }]
                                });
                            }
                        }
                    }
                    
                    // Forward message to client with extracted audio or text
                    const messageToSend = {
                        type: 'gemini_message',
                        data: {
                            ...message,
                            data: audioData, // Add extracted audio data
                            text: textData   // Add extracted text data
                        }
                    };
                    clientWs.send(JSON.stringify(messageToSend));
                },
                onerror: (error) => {
                    console.error('Gemini error:', error);
                    clientWs.send(JSON.stringify({ type: 'error', error: error.message }));
                },
                onclose: (event) => {
                    debugLog('Gemini connection closed:', event.reason);
                    clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
                }
            },
            config: config
        });

        geminiWs = session;
        currentModality = modality;
        debugLog(`✅ Connected to Gemini with ${modality} modality`);
    };

    // Initial connection with AUDIO modality
    connectToGemini('AUDIO');

    // Handle messages from client
    clientWs.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            // Handle modality change
            if (message.type === 'set_modality') {
                const newModality = message.modality; // 'AUDIO' or 'TEXT'
                debugLog(`🔄 Modality change requested: ${currentModality} -> ${newModality}`);
                
                if (newModality !== currentModality) {
                    // CRITICAL: Mark modality as changing to reject any in-flight messages
                    const oldModality = currentModality;
                    currentModality = 'SWITCHING'; // Temporary state to reject all messages
                    
                    debugLog('🚫 Rejecting any in-flight messages during switch...');
                    
                    // Add delay to ensure all in-flight audio messages are processed/rejected
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Reconnect with new modality
                    connectToGemini(newModality).then(() => {
                        debugLog(`✅ Modality switched: ${oldModality} -> ${newModality}`);
                    }).catch(err => {
                        console.error('❌ Error switching modality:', err);
                        // Fallback to old modality
                        currentModality = oldModality;
                    });
                    
                    clientWs.send(JSON.stringify({ 
                        type: 'modality_changed', 
                        modality: newModality 
                    }));
                }
            } 
            else if (message.type === 'interrupt' && geminiWs) {
                debugLog('⏸️  Interrupt signal received');
                // Stop any ongoing audio playback on backend side if needed
                // For now, just acknowledge
                clientWs.send(JSON.stringify({ 
                    type: 'interrupted',
                    timestamp: Date.now()
                }));
            }
            else if (message.type === 'audio' && geminiWs) {
                // CRITICAL: Strictly reject audio if not in AUDIO mode OR if switching
                if (currentModality !== 'AUDIO') {
                    console.warn(`⚠️ REJECTED audio message (current mode: ${currentModality}) - ignoring in-flight chunk`);
                    return; // Hard reject - prevents "Cannot extract voices" error
                }
                
                debugLog('🎤 Forwarding audio to Gemini (AUDIO mode)...');
                try {
                    geminiWs.sendRealtimeInput({
                        audio: {
                            data: message.data,
                            mimeType: 'audio/pcm;rate=16000'
                        }
                    });
                } catch (err) {
                    console.error('❌ Error sending audio to Gemini:', err);
                    // If error contains "Cannot extract voices", it means we're in TEXT mode
                    if (err.message && err.message.includes('Cannot extract voices')) {
                        console.error('🚨 CRITICAL: Audio sent in TEXT mode - this should not happen!');
                    }
                }
            } else if (message.type === 'video' && geminiWs) {
                // Handle video/screen sharing frames
                if (currentModality === 'SWITCHING') {
                    console.warn('⚠️ REJECTED video frame during modality switch');
                    return;
                }
                
                debugLog('📹 Forwarding video frame to Gemini...');
                try {
                    geminiWs.sendRealtimeInput({
                        video: {
                            data: message.data, // base64 encoded video frame
                            mimeType: message.mimeType || 'image/jpeg'
                        }
                    });
                } catch (err) {
                    console.error('❌ Error sending video to Gemini:', err);
                }
            } else if (message.type === 'camera' && geminiWs) {
                // Handle camera frames (prepared for future use)
                if (currentModality === 'SWITCHING') {
                    console.warn('⚠️ REJECTED camera frame during modality switch');
                    return;
                }
                
                debugLog('📷 Forwarding camera frame to Gemini...');
                try {
                    geminiWs.sendRealtimeInput({
                        video: {
                            data: message.data, // base64 encoded camera frame
                            mimeType: message.mimeType || 'image/jpeg'
                        }
                    });
                } catch (err) {
                    console.error('❌ Error sending camera to Gemini:', err);
                }
            } else if (message.type === 'text' && geminiWs) {
                // Existing text handling
                // Allow text in both TEXT and AUDIO modes
                if (currentModality === 'SWITCHING') {
                    console.warn('⚠️ REJECTED text message during modality switch');
                    return;
                }
                debugLog(`📝 Forwarding text to Gemini (${currentModality} mode)...`);
                try {
                    // Use sendClientContent method from the session object
                    geminiWs.sendClientContent({
                        turns: [{
                            role: 'user',
                            parts: [{ text: message.text }]
                        }],
                        turnComplete: true
                    });
                } catch (err) {
                    console.error('❌ Error sending text to Gemini:', err);
                }
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    });

    clientWs.on('close', () => {
        debugLog('Client disconnected');
        if (geminiWs) {
            geminiWs.close();
        }
    });
});

// HTTP server
const server = app.listen(PORT, () => {
    debugLog(`🚀 Apsara Live Backend running on port ${PORT}`);
    debugLog(`📧 Email service configured for: shubharthaksangharsha@gmail.com`);
});

// Upgrade HTTP connection to WebSocket
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Apsara Live Backend' });
});

// Test email endpoint (for debugging)
app.post('/test-email', async (req, res) => {
    const { message } = req.body;
    const result = await sendEmailToShubharthak(message || 'Test message from Apsara Live');
    res.json(result);
});

