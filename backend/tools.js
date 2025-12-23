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
              description: 'The message content to send to Shubharthak'
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
      
      case 'copy_to_clipboard':
        return await copyToClipboard(args.text);
      
      case 'get_clipboard_text':
        return await getClipboardText();
      
      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`❌ Error executing ${functionName}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  toolDeclarations,
  executeTool,
  sendEmailToShubharthak,
  takeScreenshot,
  copyToClipboard,
  getClipboardText
};
