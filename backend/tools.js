/**
 * Apsara AI - Tool Functions
 * This module contains all the tool/function implementations that Apsara can use
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Debug logging helper
const debugLog = (...args) => {
  const DEBUG_LOG = process.env.DEBUG_LOG !== 'false';
  if (DEBUG_LOG) console.log(...args);
};

// Email configuration
let emailTransporter = null;

// Memory storage (in-memory for now, can be persisted to file later)
let memoryStore = [];

/**
 * Initialize email transporter
 */
function initEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
  return emailTransporter;
}

/**
 * Send email to Shubharthak with optional image attachment
 * @param {string} message - The message content
 * @param {string} senderInfo - Optional sender information
 * @param {string} imageBase64 - Optional base64 encoded image
 * @param {string} imageFilename - Optional filename for the image
 * @returns {Promise<Object>} Result object with success status
 */
async function sendEmailToShubharthak(message, senderInfo = '', imageBase64 = null, imageFilename = 'screenshot.jpg') {
  try {
    const transporter = initEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'shubharthaksangharsha@gmail.com',
      subject: `Message from Apsara Live Assistant`,
      html: `
        <h2>New message from Apsara Live</h2>
        <p><strong>Message:</strong> ${message}</p>
        ${senderInfo ? `<p><strong>Context:</strong> ${senderInfo}</p>` : ''}
        <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
      `
    };

    // Add image attachment if provided
    if (imageBase64) {
      mailOptions.attachments = [{
        filename: imageFilename,
        content: imageBase64,
        encoding: 'base64'
      }];
    }

    const info = await transporter.sendMail(mailOptions);
    debugLog('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Take a screenshot of the current screen
 * @returns {Promise<Object>} Result with base64 encoded screenshot
 */
async function takeScreenshot() {
  try {
    const platform = process.platform;
    const screenshotPath = path.join(__dirname, 'temp_screenshot.png');
    
    let command;
    if (platform === 'linux') {
      // Use scrot or gnome-screenshot on Linux
      command = `gnome-screenshot -f ${screenshotPath} 2>/dev/null || scrot ${screenshotPath}`;
    } else if (platform === 'darwin') {
      // macOS
      command = `screencapture -x ${screenshotPath}`;
    } else if (platform === 'win32') {
      // Windows - using PowerShell
      command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}'); Start-Sleep -Milliseconds 500"`;
    } else {
      return { success: false, error: 'Unsupported platform' };
    }

    await execAsync(command);
    
    // Read the screenshot file
    if (fs.existsSync(screenshotPath)) {
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');
      
      // Clean up temp file
      fs.unlinkSync(screenshotPath);
      
      debugLog('✅ Screenshot captured successfully');
      return { 
        success: true, 
        image: base64Image,
        mimeType: 'image/png',
        filename: `screenshot_${new Date().toISOString().replace(/:/g, '-')}.png`
      };
    } else {
      return { success: false, error: 'Screenshot file not created' };
    }
  } catch (error) {
    console.error('❌ Screenshot error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Copy text to system clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<Object>} Result object
 */
async function copyToClipboard(text) {
  try {
    const platform = process.platform;
    
    let command;
    if (platform === 'linux') {
      // Use xclip or xsel on Linux
      command = `echo "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard 2>/dev/null || echo "${text.replace(/"/g, '\\"')}" | xsel --clipboard`;
    } else if (platform === 'darwin') {
      // macOS
      command = `echo "${text.replace(/"/g, '\\"')}" | pbcopy`;
    } else if (platform === 'win32') {
      // Windows
      command = `powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`; 
    } else {
      return { success: false, error: 'Unsupported platform' };
    }

    await execAsync(command);
    debugLog('✅ Text copied to clipboard');
    return { success: true, message: 'Text copied to clipboard successfully' };
  } catch (error) {
    console.error('❌ Clipboard error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get text from system clipboard
 * @returns {Promise<Object>} Result with clipboard text
 */
async function getClipboardText() {
  try {
    const platform = process.platform;
    
    let command;
    if (platform === 'linux') {
      command = 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard';
    } else if (platform === 'darwin') {
      command = 'pbpaste';
    } else if (platform === 'win32') {
      command = 'powershell -command "Get-Clipboard"';
    } else {
      return { success: false, error: 'Unsupported platform' };
    }

    const { stdout } = await execAsync(command);
    debugLog('✅ Retrieved clipboard text');
    return { success: true, text: stdout.trim() };
  } catch (error) {
    console.error('❌ Clipboard retrieval error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Paste text from clipboard using keyboard shortcut (Ctrl+V / Cmd+V)
 * @returns {Promise<Object>} Result object
 */
async function pasteFromClipboard() {
  try {
    const platform = process.platform;
    
    let command;
    if (platform === 'linux') {
      // Use xdotool to simulate Ctrl+V
      command = 'xdotool key ctrl+v';
    } else if (platform === 'darwin') {
      // macOS - use AppleScript to simulate Cmd+V
      command = 'osascript -e \'tell application "System Events" to keystroke "v" using command down\'';
    } else if (platform === 'win32') {
      // Windows - use PowerShell with SendKeys
      command = 'powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"';
    } else {
      return { success: false, error: 'Unsupported platform' };
    }

    await execAsync(command);
    debugLog('✅ Paste command executed');
    return { success: true, message: 'Paste command executed successfully' };
  } catch (error) {
    console.error('❌ Paste error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store a memory/note for later retrieval
 * @param {string} content - The content to remember
 * @param {string} category - Optional category/tag for the memory
 * @returns {Promise<Object>} Result object
 */
async function storeMemory(content, category = 'general') {
  try {
    const memory = {
      id: Date.now(),
      content: content,
      category: category,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    
    memoryStore.push(memory);
    debugLog(`💾 Memory stored: [${category}] ${content.substring(0, 50)}...`);
    
    return { 
      success: true, 
      message: `Memory stored successfully`,
      memoryId: memory.id,
      totalMemories: memoryStore.length
    };
  } catch (error) {
    console.error('❌ Memory storage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve memories based on search query or category
 * @param {string} query - Search query or category
 * @returns {Promise<Object>} Result with matching memories
 */
async function retrieveMemories(query = '') {
  try {
    let results;
    
    if (!query || query.trim() === '') {
      // Return all memories if no query
      results = memoryStore;
    } else {
      // Search in content and category
      const searchTerm = query.toLowerCase();
      results = memoryStore.filter(mem => 
        mem.content.toLowerCase().includes(searchTerm) ||
        mem.category.toLowerCase().includes(searchTerm)
      );
    }
    
    debugLog(`🔍 Memory search for "${query}": ${results.length} results`);
    
    return {
      success: true,
      count: results.length,
      memories: results.map(m => ({
        content: m.content,
        category: m.category,
        date: m.date
      }))
    };
  } catch (error) {
    console.error('❌ Memory retrieval error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all memories or specific category
 * @param {string} category - Optional category to clear (clears all if not specified)
 * @returns {Promise<Object>} Result object
 */
async function clearMemories(category = null) {
  try {
    const beforeCount = memoryStore.length;
    
    if (category) {
      memoryStore = memoryStore.filter(m => m.category.toLowerCase() !== category.toLowerCase());
      debugLog(`🗑️ Cleared memories in category: ${category}`);
    } else {
      memoryStore = [];
      debugLog('🗑️ Cleared all memories');
    }
    
    const clearedCount = beforeCount - memoryStore.length;
    
    return {
      success: true,
      message: category ? `Cleared ${clearedCount} memories from category "${category}"` : `Cleared all ${clearedCount} memories`,
      remainingMemories: memoryStore.length
    };
  } catch (error) {
    console.error('❌ Memory clear error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tool function declarations for Gemini API
 */
const toolDeclarations = [
  // Google Search - built-in
  { googleSearch: {} },
  
  // Custom tools
  {
    functionDeclarations: [
      {
        name: 'send_email_to_shubharthak',
        description: 'Send an email message to Shubharthak Sangharsha. Can include image attachments. Use this when users want to contact him, leave a message, send inquiries, or share screenshots/images.',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message content to send to Shubharthark'
            },
            senderInfo: {
              type: 'string',
              description: 'Optional information about the sender (name, contact info if provided)'
            },
            imageBase64: {
              type: 'string',
              description: 'Optional base64 encoded image to attach (without data URI prefix)'
            },
            imageFilename: {
              type: 'string',
              description: 'Optional filename for the attached image (default: screenshot.jpg)'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of the current screen. Returns base64 encoded image that can be viewed or emailed. Use this when user asks to capture the screen, take a screenshot, or wants to save what they\'re seeing.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'screenshot_and_email',
        description: 'Take a screenshot and immediately email it to Shubharthak. This is a COMBINED operation that does both in one step. Use this when user says "screenshot and email", "take a screenshot and send it", or similar combined requests.',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The email message to send with the screenshot (default: "Screenshot attached")'
            },
            senderInfo: {
              type: 'string',
              description: 'Optional information about the sender or context'
            }
          },
          required: []
        }
      },
      {
        name: 'copy_to_clipboard',
        description: 'Copy text to the system clipboard. Use when user asks to copy something, save text for later, or wants text readily available for pasting.',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to copy to clipboard'
            }
          },
          required: ['text']
        }
      },
      {
        name: 'get_clipboard_text',
        description: 'Get the current text from system clipboard. Use when user asks what\'s in clipboard, to read clipboard, or reference copied text.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'paste_from_clipboard',
        description: 'Simulate keyboard paste (Ctrl+V or Cmd+V) to paste clipboard content into the active application. Use when user asks to paste, insert clipboard content, or use what was copied.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'store_memory',
        description: 'Store a memory/note for later retrieval. Optionally categorize memories. Use this to remember important information, user preferences, or any notes the user wants to keep.',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content of the memory/note'
            },
            category: {
              type: 'string',
              description: 'Optional category or tag for the memory'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'retrieve_memories',
        description: 'Retrieve stored memories/notes. Can search by query or filter by category. Use this to recall information, check stored notes, or find specific memories.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional search query or category to filter memories'
            }
          },
          required: []
        }
      },
      {
        name: 'clear_memories',
        description: 'Clear all memories or those in a specific category. Use with caution. Use this to delete unnecessary memories, free up space, or remove outdated information.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional category to clear (clears all if not specified)'
            }
          },
          required: []
        }
      },
      {
        name: 'screenshot_and_email',
        description: 'Take a screenshot and email it to Shubharthak in one operation. Use this to quickly capture and send screen content without multiple steps.',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Email message content'
            },
            senderInfo: {
              type: 'string',
              description: 'Optional sender information'
            }
          },
          required: []
        }
      }
    ]
  }
];

/**
 * Execute a tool function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments
 * @returns {Promise<Object>} Function result
 */
async function executeTool(functionName, args) {
  debugLog(`🔧 Executing tool: ${functionName}`, args);
  
  try {
    switch (functionName) {
      case 'send_email_to_shubharthak':
        return await sendEmailToShubharthak(
          args.message,
          args.senderInfo,
          args.imageBase64,
          args.imageFilename
        );
      
      case 'take_screenshot':
        return await takeScreenshot();
      
      case 'screenshot_and_email':
        return await screenshotAndEmail(args.message, args.senderInfo);
      
      case 'copy_to_clipboard':
        return await copyToClipboard(args.text);
      
      case 'get_clipboard_text':
        return await getClipboardText();
      
      case 'paste_from_clipboard':
        return await pasteFromClipboard();
      
      case 'store_memory':
        return await storeMemory(args.content, args.category);
      
      case 'retrieve_memories':
        return await retrieveMemories(args.query);
      
      case 'clear_memories':
        return await clearMemories(args.category);
      
      case 'screenshot_and_email':
        return await screenshotAndEmail(args.message, args.senderInfo);
      
      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`❌ Error executing ${functionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Take screenshot and email it to Shubharthak in one operation
 * @param {string} message - Email message
 * @param {string} senderInfo - Optional sender information
 * @returns {Promise<Object>} Result object
 */
async function screenshotAndEmail(message = 'Screenshot attached', senderInfo = '') {
  try {
    debugLog('📸 Taking screenshot for email...');
    
    // Step 1: Take screenshot
    const screenshotResult = await takeScreenshot();
    
    if (!screenshotResult.success) {
      return { success: false, error: `Screenshot failed: ${screenshotResult.error}` };
    }
    
    debugLog('✅ Screenshot captured, now sending email...');
    
    // Step 2: Send email with screenshot
    const emailResult = await sendEmailToShubharthak(
      message,
      senderInfo,
      screenshotResult.image,
      screenshotResult.filename
    );
    
    if (!emailResult.success) {
      return { success: false, error: `Email failed: ${emailResult.error}` };
    }
    
    debugLog('✅ Screenshot emailed successfully');
    return {
      success: true,
      message: 'Screenshot captured and emailed successfully',
      emailId: emailResult.messageId,
      filename: screenshotResult.filename
    };
  } catch (error) {
    console.error('❌ Screenshot+Email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  toolDeclarations,
  executeTool,
  sendEmailToShubharthak,
  takeScreenshot,
  screenshotAndEmail,
  copyToClipboard,
  getClipboardText,
  pasteFromClipboard,
  storeMemory,
  retrieveMemories,
  clearMemories
};
