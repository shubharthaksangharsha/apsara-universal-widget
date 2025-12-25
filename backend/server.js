/**
 * Apsara Live - Backend Server for Oracle Hosting
 * This server acts as a secure proxy between your frontend and Gemini Live API
 */

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import tools module
const { getToolDeclarations, executeTool, getEnabledTools, getAllTools, setEnabledTools, setToolOrder, setToolAsyncSettings, getImageGenerationModel, setImageGenerationModel, TOOL_METADATA } = require('./tools');

// Debug logging toggle
const DEBUG_LOG = true; // Set to false to disable debug logging

// Debug frame saving toggle
const SAVE_DEBUG_FRAMES = false; // Set to false to disable saving screen frames

// Debug log helper - only logs when DEBUG_LOG is true
const debugLog = (...args) => {
  if (DEBUG_LOG) console.log(...args);
};

// Create debug frames directory if it doesn't exist
const debugFramesDir = path.join(__dirname, 'debug_frames');
if (SAVE_DEBUG_FRAMES && !fs.existsSync(debugFramesDir)) {
  fs.mkdirSync(debugFramesDir, { recursive: true });
  console.log('📁 Created debug_frames directory');
}

// Store last 2 frames for debugging
let lastScreenFrames = [];
let lastCameraFrames = [];

// Helper function to save debug frame
const saveDebugFrame = (base64Data, type) => {
  if (!SAVE_DEBUG_FRAMES) return;
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${type}_${timestamp}.jpg`;
  const filepath = path.join(debugFramesDir, filename);
  
  try {
    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    // Keep only last 2 frames
    if (type === 'screen') {
      lastScreenFrames.push(filepath);
      if (lastScreenFrames.length > 2) {
        const oldFile = lastScreenFrames.shift();
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
    } else if (type === 'camera') {
      lastCameraFrames.push(filepath);
      if (lastCameraFrames.length > 2) {
        const oldFile = lastCameraFrames.shift();
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
    }
    
    debugLog(`💾 Saved ${type} frame: ${filename}`);
  } catch (err) {
    console.error(`❌ Error saving ${type} frame:`, err);
  }
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

/**
 * Generate dynamic system prompt based on enabled tools
 */
function generateSystemPrompt() {
  const enabledTools = getEnabledTools();
  
  // Build capabilities list based on enabled tools
  const capabilities = [
    'Real-time voice conversations with natural interruption handling',
    'Viewing camera and screen share - you can see what users show you',
    'Answering questions about Shubharthak\'s work, projects, and experience',
    'Providing information about his skills, education, and background',
    'Discussing his freelance work and client projects',
    'Explaining his technical expertise in detail'
  ];
  
  // Add tool-specific capabilities
  if (enabledTools.googleSearch) {
    capabilities.push('Searching Google for real-time information (current events, news, weather, sports, latest tech updates, etc.)');
  }
  if (enabledTools.send_email_to_shubharthak) {
    capabilities.push('Sending messages to Shubharthak via email (with image attachments)');
  }
  if (enabledTools.take_screenshot) {
    capabilities.push('Taking screenshots of the current screen');
  }
  if (enabledTools.screenshot_and_email) {
    capabilities.push('Capturing and emailing screenshots to Shubharthak');
  }
  if (enabledTools.copy_to_clipboard) {
    capabilities.push('Copying text to the system clipboard');
  }
  if (enabledTools.get_clipboard_text) {
    capabilities.push('Reading text from the system clipboard');
  }
  if (enabledTools.paste_from_clipboard) {
    capabilities.push('Pasting clipboard content into active applications');
  }
  if (enabledTools.store_memory || enabledTools.retrieve_memories) {
    capabilities.push('Storing and retrieving memories/notes for later use');
  }
  if (enabledTools.read_file || enabledTools.browse_files) {
    capabilities.push('Reading local files and browsing directories');
  }
  if (enabledTools.create_file || enabledTools.edit_file || enabledTools.move_file || enabledTools.rename_file || enabledTools.delete_file) {
    capabilities.push('Creating, editing, moving, renaming, and deleting files');
  }
  if (enabledTools.open_url) {
    capabilities.push('Opening websites in browser');
  }
  if (enabledTools.generate_image) {
    capabilities.push('AI image generation using Nano Banana (create any image from text descriptions)');
  }
  if (enabledTools.computer_use) {
    capabilities.push('COMPUTER USE - Full mouse & keyboard control using screen coordinates (POWERFUL: requires screen sharing)');
  }
  if (enabledTools.share_screen || enabledTools.share_camera) {
    capabilities.push('Sharing screen and camera with you (you can see what user is doing)');
  }
  if (enabledTools.change_theme) {
    capabilities.push('Changing the UI theme/appearance on user request');
  }
  
  // Build tool usage section
  const toolUsageLines = [];
  if (enabledTools.send_email_to_shubharthak) {
    toolUsageLines.push('- send_email_to_shubharthak: Send messages to Shubharthak, can include image attachments');
  }
  if (enabledTools.take_screenshot) {
    toolUsageLines.push('- take_screenshot: Capture the current screen (returns {success, image, filename})');
  }
  if (enabledTools.screenshot_and_email) {
    toolUsageLines.push('- screenshot_and_email: **COMBINED** operation - takes screenshot AND emails it in one step');
  }
  if (enabledTools.copy_to_clipboard) {
    toolUsageLines.push('- copy_to_clipboard: Copy text for easy pasting');
  }
  if (enabledTools.get_clipboard_text) {
    toolUsageLines.push('- get_clipboard_text: Read what\'s currently in clipboard');
  }
  if (enabledTools.paste_from_clipboard) {
    toolUsageLines.push('- paste_from_clipboard: Simulate keyboard paste (Ctrl+V/Cmd+V) to insert clipboard content');
  }
  if (enabledTools.store_memory) {
    toolUsageLines.push('- store_memory: Save important information, notes, or user preferences');
  }
  if (enabledTools.retrieve_memories) {
    toolUsageLines.push('- retrieve_memories: Search and recall stored memories/notes');
  }
  if (enabledTools.clear_memories) {
    toolUsageLines.push('- clear_memories: Delete memories (use with caution)');
  }
  if (enabledTools.read_file) {
    toolUsageLines.push('- read_file: Read any file from the filesystem (text or binary as base64)');
  }
  if (enabledTools.browse_files) {
    toolUsageLines.push('- browse_files: List files and directories with details');
  }
  if (enabledTools.create_file) {
    toolUsageLines.push('- create_file: Create new files with content');
  }
  if (enabledTools.edit_file) {
    toolUsageLines.push('- edit_file: Edit existing files (write or append mode)');
  }
  if (enabledTools.move_file) {
    toolUsageLines.push('- move_file: Move files to new locations');
  }
  if (enabledTools.rename_file) {
    toolUsageLines.push('- rename_file: Rename files in same directory');
  }
  if (enabledTools.delete_file) {
    toolUsageLines.push('- delete_file: Delete files (requires confirmation - ALWAYS ask user first!)');
  }
  if (enabledTools.open_url) {
    toolUsageLines.push('- open_url: Open URLs in default browser');
  }
  if (enabledTools.generate_image) {
    toolUsageLines.push('- generate_image: AI image generation with Nano Banana (creates images from text descriptions)');
  }
  if (enabledTools.computer_use) {
    toolUsageLines.push('- computer_use: **POWERFUL** Control mouse & keyboard using coordinates. REQUIRES screen sharing. Actions: click, double_click, right_click, type, key, scroll. Origin (0,0) = top-left. ALWAYS look at screen before clicking!');
  }
  if (enabledTools.share_screen) {
    toolUsageLines.push('- share_screen: Share user\'s screen with you (you can see what they\'re doing). Optional resolution parameter.');
  }
  if (enabledTools.share_camera) {
    toolUsageLines.push('- share_camera: Share user\'s camera with you (you can see them). Optional resolution parameter.');
  }
  if (enabledTools.change_theme) {
    toolUsageLines.push('- change_theme: Change the UI theme (light, dark, nightly, dracula, monokai, nord, solarized-light, solarized-dark).');
  }
  if (enabledTools.googleSearch) {
    toolUsageLines.push('- Google Search: Automatic real-time information retrieval');
  }
  
  const toolUsageSection = toolUsageLines.length > 0 
    ? `\n**Available Tools:**\n${toolUsageLines.join('\n')}` 
    : '';
  
  return `You are Apsara, an advanced AI voice assistant created by Shubharthak Sangharasha. You are friendly, helpful, and conversational. When greeting users or introducing yourself, be warm and professional.

**Your Capabilities:**
${capabilities.map(c => `- ${c}`).join('\n')}

**How to interact with users:**
- Be conversational and friendly
- Respond only in English until user dont want to speak in other language
- Answer questions naturally about Shubharthak's experience and projects
- When users show you something via camera or screen share, you can see and analyze it
- Provide detailed but concise information
- Show enthusiasm about the projects and work${enabledTools.send_email_to_shubharthak ? '\n- If someone wants to contact Shubharthak, offer to send a message via email' : ''}${enabledTools.googleSearch ? '\n- For questions about current events, news, weather, sports scores, latest tech updates, or anything requiring real-time information, Google Search will automatically provide accurate, up-to-date answers\n- Always cite sources when sharing information from Google Search' : ''}${toolUsageSection}

**Example workflows:**${enabledTools.screenshot_and_email ? '\n- "Screenshot this and email it to Shubharthak" → Use screenshot_and_email (single tool call!)' : ''}${enabledTools.take_screenshot ? '\n- "Take a screenshot" → Use take_screenshot (just capture, don\'t email)' : ''}${enabledTools.read_file && enabledTools.send_email_to_shubharthak ? '\n- "Read the file /path/to/file.txt and email it to me" → Use read_file with asBase64=true, then send_email_to_shubharthak with the base64Content from read_file result' : ''}${enabledTools.browse_files ? '\n- "Show me files in /home/user/Documents" → Use browse_files with dirPath parameter' : ''}${enabledTools.create_file ? '\n- "Create a file called notes.txt with my todo list" → Use create_file with filePath and content' : ''}${enabledTools.edit_file ? '\n- "Add this line to my notes" → Use edit_file with mode="append"' : ''}${enabledTools.rename_file ? '\n- "Rename file.txt to document.txt" → Use rename_file' : ''}${enabledTools.delete_file ? '\n- "Delete old-file.txt" → ALWAYS ask user for confirmation first, then use delete_file with confirm=true' : ''}${enabledTools.open_url ? '\n- "Open google.com" → Use open_url' : ''}${enabledTools.fill_form ? '\n- "Fill this form at example.com/contact with my email" → Use fill_form with url and formData object' : ''}${enabledTools.click_element ? '\n- "Click the login button on example.com" → Use click_element with url and selector' : ''}${enabledTools.copy_to_clipboard && enabledTools.paste_from_clipboard ? '\n- "Copy this text and paste it" → Use copy_to_clipboard, then paste_from_clipboard' : ''}${enabledTools.store_memory ? '\n- "Remember this for later" → Use store_memory with the content' : ''}${enabledTools.retrieve_memories ? '\n- "What did I ask you to remember?" → Use retrieve_memories' : ''}${enabledTools.get_clipboard_text ? '\n- "Get text from clipboard and summarize it" → Use get_clipboard_text, then explain the content naturally (don\'t just read it back)' : ''}${enabledTools.paste_from_clipboard ? '\n- "Paste what I copied earlier" → Use paste_from_clipboard' : ''}

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
}

// Generate initial system prompt
let SYSTEM_PROMPT = generateSystemPrompt();

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
        
        // Set response modalities based on selected mode
        const responseModalities = modality === 'AUDIO' 
            ? [Modality.AUDIO] 
            : [Modality.TEXT];

        // Get current tool declarations (dynamically generated based on enabled tools)
        const currentToolDeclarations = getToolDeclarations();
        
        // Build config differently for AUDIO vs TEXT to avoid audio-related fields in TEXT mode
        const config = modality === 'AUDIO' ? {
            responseModalities: responseModalities,
            systemInstruction: SYSTEM_PROMPT,
            mediaResolution: 'MEDIA_RESOLUTION_HIGH',
            tools: currentToolDeclarations,  // Use dynamically generated tool declarations
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true  // Enable thought summaries for logging
            },
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
            mediaResolution: 'MEDIA_RESOLUTION_HIGH',
            tools: currentToolDeclarations,  // Use dynamically generated tool declarations
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true  // Enable thought summaries for logging
            }
        };

        // Log thinking configuration
        if (config.thinkingConfig) {
            console.log('🧠 Thinking enabled:', {
                budget: config.thinkingConfig.thinkingBudget,
                includeThoughts: config.thinkingConfig.includeThoughts
            });
        }
        
        debugLog('🔧 Session config:', { 
            modality, 
            responseModalities: responseModalities.map(m => m === Modality.AUDIO ? 'AUDIO' : 'TEXT'),
            hasSpeechConfig: !!config.speechConfig,
            hasThinkingConfig: !!config.thinkingConfig,
            thinkingBudget: config.thinkingConfig?.thinkingBudget,
            includeThoughts: config.thinkingConfig?.includeThoughts,
            configKeys: Object.keys(config),
            toolsCount: currentToolDeclarations.length
        });
        
        // Log enabled tools for debugging
        debugLog('🔧 Enabled tools:', currentToolDeclarations.map(t => 
            t.googleSearch ? 'googleSearch' : (t.functionDeclarations?.map(f => f.name).join(', ') || 'none')
        ).join(', '));

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: () => {
                    debugLog('✅ Connected to Gemini');
                    clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
                },
                onmessage: async (message) => {
                    debugLog('📨 Received message from Gemini:', JSON.stringify(Object.keys(message)));
                    
                    // Extract and log thoughts if present
                    if (message.serverContent?.modelTurn?.thought) {
                        const thought = message.serverContent.modelTurn.thought;
                        console.log('\n🧠 ========== GEMINI THOUGHT ==========');
                        if (thought.text) {
                            console.log('💭 Thought Text:', thought.text);
                        }
                        if (thought.thoughtParts) {
                            console.log('💭 Thought Parts:', JSON.stringify(thought.thoughtParts, null, 2));
                        }
                        console.log('🧠 ====================================\n');
                    }
                    
                    // Extract audio from serverContent.inlineData - ONLY in AUDIO mode
                    let audioData = null;
                    let textData = null;
                    
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            // Log thoughts from parts if present
                            if (part.thought) {
                                console.log('\n🧠 ========== PART THOUGHT ==========');
                                if (part.thought.text) {
                                    console.log('💭 Thought:', part.thought.text);
                                }
                                if (part.text) {
                                    console.log('💭 Thought Context:', part.text);
                                }
                                console.log('🧠 ====================================\n');
                            }
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
                            debugLog(`🔧 Tool call received: ${fc.name}`, fc.args);
                            
                            // Execute tool using tools module
                            const result = await executeTool(fc.name, fc.args);
                            
                            // Send response back to Gemini
                            session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id,
                                    name: fc.name,
                                    response: result
                                }]
                            });
                            
                            // If image generation, broadcast to frontend for display
                            if (fc.name === 'generate_image' && result.success && result.base64Image) {
                                debugLog('🎨 Broadcasting generated image to frontend...');
                                ws.send(JSON.stringify({
                                    type: 'generated_image',
                                    data: {
                                        base64Image: result.base64Image,
                                        filename: result.filename,
                                        filepath: result.filepath,
                                        model: result.model,
                                        aspectRatio: result.aspectRatio,
                                        imageSize: result.imageSize,
                                        fileSize: result.fileSize,
                                        mimeType: result.mimeType
                                    }
                                }));
                            }
                            
                            // If share_screen, trigger screen sharing in frontend
                            if (fc.name === 'share_screen' && result.success && result.action === 'start_screen_share') {
                                debugLog('🖥️ Triggering screen share in frontend...');
                                clientWs.send(JSON.stringify({
                                    type: 'trigger_screen_share',
                                    data: {
                                        resolution: result.resolution
                                    }
                                }));
                            }
                            
                            // If share_camera, trigger camera sharing in frontend
                            if (fc.name === 'share_camera' && result.success && result.action === 'start_camera') {
                                debugLog('📷 Triggering camera share in frontend...');
                                clientWs.send(JSON.stringify({
                                    type: 'trigger_camera_share',
                                    data: {
                                        resolution: result.resolution
                                    }
                                }));
                            }
                            
                            // If change_theme, trigger theme change in frontend
                            if (fc.name === 'change_theme' && result.success && result.action === 'change_theme') {
                                debugLog('🎨 Triggering theme change in frontend...');
                                clientWs.send(JSON.stringify({
                                    type: 'trigger_theme_change',
                                    data: {
                                        theme: result.theme
                                    }
                                }));
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
                    console.error('❌ Gemini error:', error);
                    clientWs.send(JSON.stringify({ type: 'error', error: error.message }));
                },
                onclose: (event) => {
                    debugLog('🔌 Gemini connection closed:', event?.reason || 'Unknown reason');
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
                
                debugLog('📹 Forwarding screen frame to Gemini...');
                
                // Save debug frame (last 2 only)
                saveDebugFrame(message.data, 'screen');
                
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
                // Handle camera frames
                if (currentModality === 'SWITCHING') {
                    console.warn('⚠️ REJECTED camera frame during modality switch');
                    return;
                }
                
                debugLog('📷 Forwarding camera frame to Gemini...');
                
                // Save debug frame (last 2 only)
                saveDebugFrame(message.data, 'camera');
                
                try {
                    geminiWs.sendRealtimeInput({
                        video: {
                            data: message.data, // base64 encoded camera frame
                            mimeType: message.mimeType || 'image/jpeg'
                        },
                        
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

// Get all available tools with their status
app.get('/api/tools', (req, res) => {
    try {
        const tools = getAllTools();
        res.json({ success: true, tools });
    } catch (error) {
        console.error('❌ Error getting tools:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update enabled tools configuration
app.post('/api/tools/update', (req, res) => {
    try {
        const { tools, order, asyncSettings, imageModel } = req.body;
        
        let updatedTools;
        
        // Update enabled/disabled state
        if (tools && typeof tools === 'object') {
            setEnabledTools(tools);
        }
        
        // Update tool order
        if (order && Array.isArray(order)) {
            setToolOrder(order);
        }
        
        // Update async settings
        if (asyncSettings && typeof asyncSettings === 'object') {
            setToolAsyncSettings(asyncSettings);
        }
        
        // Update image generation model
        if (imageModel && typeof imageModel === 'string') {
            setImageGenerationModel(imageModel);
            debugLog('🎨 Image generation model updated to:', imageModel);
        }
        
        // Get updated tools list
        updatedTools = getAllTools();
        
        // Regenerate system prompt with new configuration
        SYSTEM_PROMPT = generateSystemPrompt();
        
        debugLog('✅ Tools configuration updated');
        debugLog('🔄 System prompt regenerated');
        
        res.json({ 
            success: true, 
            tools: updatedTools,
            message: 'Tools configuration updated successfully. Restart your session to apply changes.' 
        });
    } catch (error) {
        console.error('❌ Error updating tools:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test email endpoint (for debugging)
app.post('/test-email', async (req, res) => {
    const { message } = req.body;
    const { sendEmailToShubharthak } = require('./tools');
    const result = await sendEmailToShubharthak(message || 'Test message from Apsara Live');
    res.json(result);
});

// Email generated image endpoint
app.post('/api/email-image', async (req, res) => {
    try {
        const { base64Image, filename, mimeType } = req.body;
        
        if (!base64Image || !filename) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: base64Image, filename' 
            });
        }
        
        const { sendEmailToShubharthak } = require('./tools');
        const result = await sendEmailToShubharthak(
            '🎨 Apsara Generated Image\n\nHere is the AI-generated image you requested.',
            'Apsara AI Assistant',
            base64Image,
            filename,
            mimeType || 'image/png'
        );
        
        res.json(result);
    } catch (error) {
        console.error('❌ Error emailing image:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

