/**
 * Apsara AI - Tool Functions
 * This module contains all the tool/function implementations that Apsara can use
 * 
 * SYSTEM DEPENDENCIES (for clipboard and screenshot tools):
 * 
 * Linux:
 *   - Screenshot: gnome-screenshot OR scrot
 *   - Clipboard: xclip OR xsel
 *   - Paste automation: xdotool
 *   Install: sudo apt install gnome-screenshot xclip xdotool (Ubuntu/Debian)
 *            sudo dnf install gnome-screenshot xclip xdotool (Fedora/RHEL)
 *            sudo pacman -S gnome-screenshot xclip xdotool (Arch)
 * 
 * macOS:
 *   - All tools are built-in (screencapture, pbcopy, pbpaste, osascript)
 *   - No additional installation required
 * 
 * Windows:
 *   - All tools use built-in PowerShell cmdlets
 *   - Requires PowerShell 5.1+ and .NET Framework
 *   - No additional installation required
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Structured debug configuration (per-feature)
const DEBUG = {
  tools: process.env.DEBUG_TOOLS === 'true',
  email: process.env.DEBUG_EMAIL === 'true',
  clipboard: process.env.DEBUG_CLIPBOARD === 'true',
  memory: process.env.DEBUG_MEMORY === 'true'
};

const debugLog = (scope, ...args) => {
  if (DEBUG[scope]) {
    console.log(`[DEBUG:${scope.toUpperCase()}]`, ...args);
  }
};

// Tool enable/disable allowlist. Disable everything except googleSearch by default.
let ENABLED_TOOLS = {
  googleSearch: true,

  // Disabled by default for Gemini stability
  send_email_to_shubharthak: false,
  take_screenshot: false,
  screenshot_and_email: false,
  copy_to_clipboard: false,
  get_clipboard_text: false,
  paste_from_clipboard: false,
  store_memory: false,
  retrieve_memories: false,
  clear_memories: false
};

// Tool metadata for UI display (with async behavior support)
const TOOL_METADATA = {
  googleSearch: { name: 'Google Search', description: 'Real-time web search', async: false },
  send_email_to_shubharthak: { name: 'Send Email', description: 'Send messages to Shubharthak', async: true },
  take_screenshot: { name: 'Take Screenshot', description: 'Capture screen', async: true },
  screenshot_and_email: { name: 'Screenshot & Email', description: 'Capture and send screenshot', async: true },
  copy_to_clipboard: { name: 'Copy to Clipboard', description: 'Copy text', async: true },
  get_clipboard_text: { name: 'Get Clipboard', description: 'Read clipboard text', async: false },
  paste_from_clipboard: { name: 'Paste Clipboard', description: 'Paste clipboard content', async: true },
  store_memory: { name: 'Store Memory', description: 'Save information', async: true },
  retrieve_memories: { name: 'Retrieve Memories', description: 'Recall stored info', async: false },
  clear_memories: { name: 'Clear Memories', description: 'Delete stored info', async: true }
};

// Tool order and async settings (can be customized by user)
let toolOrder = Object.keys(ENABLED_TOOLS);
let toolAsyncSettings = {};
// Initialize async settings from metadata
Object.keys(TOOL_METADATA).forEach(key => {
  toolAsyncSettings[key] = TOOL_METADATA[key].async;
});

/**
 * Get current enabled tools configuration
 * @returns {Object} Current ENABLED_TOOLS configuration
 */
function getEnabledTools() {
  return { ...ENABLED_TOOLS };
}

/**
 * Get all available tools with metadata
 * @returns {Array} Array of tool objects with metadata (sorted by toolOrder)
 */
function getAllTools() {
  // Sort tools by custom order
  const orderedKeys = toolOrder.filter(key => key in ENABLED_TOOLS);
  const unorderedKeys = Object.keys(ENABLED_TOOLS).filter(key => !toolOrder.includes(key));
  const allKeys = [...orderedKeys, ...unorderedKeys];
  
  return allKeys.map((key, index) => ({
    id: key,
    name: TOOL_METADATA[key]?.name || key,
    description: TOOL_METADATA[key]?.description || '',
    enabled: ENABLED_TOOLS[key],
    async: toolAsyncSettings[key] !== undefined ? toolAsyncSettings[key] : false,
    order: index
  }));
}

/**
 * Update tool order
 * @param {Array} newOrder - New order of tool IDs
 * @returns {Object} Updated tools
 */
function setToolOrder(newOrder) {
  // Validate that all keys exist
  for (const key of newOrder) {
    if (!(key in ENABLED_TOOLS)) {
      throw new Error(`Unknown tool: ${key}`);
    }
  }
  
  toolOrder = newOrder;
  debugLog('tools', '🔧 Updated tool order:', toolOrder);
  
  return getAllTools();
}

/**
 * Update tool async settings
 * @param {Object} asyncSettings - Object mapping tool IDs to async boolean
 * @returns {Object} Updated tools
 */
function setToolAsyncSettings(asyncSettings) {
  // Validate that all keys exist
  for (const key in asyncSettings) {
    if (!(key in ENABLED_TOOLS)) {
      throw new Error(`Unknown tool: ${key}`);
    }
  }
  
  toolAsyncSettings = { ...toolAsyncSettings, ...asyncSettings };
  debugLog('tools', '🔧 Updated tool async settings:', toolAsyncSettings);
  
  return getAllTools();
}

/**
 * Update enabled tools configuration
 * @param {Object} newConfig - New enabled tools configuration
 * @returns {Object} Updated configuration
 */
function setEnabledTools(newConfig) {
  // Validate that all keys exist
  for (const key in newConfig) {
    if (!(key in ENABLED_TOOLS)) {
      throw new Error(`Unknown tool: ${key}`);
    }
  }
  
  // Update configuration
  ENABLED_TOOLS = { ...ENABLED_TOOLS, ...newConfig };
  debugLog('tools', '🔧 Updated ENABLED_TOOLS:', ENABLED_TOOLS);
  
  return { ...ENABLED_TOOLS };
}

// Email configuration
let emailTransporter = null;

// Memory storage (in-memory for now, can be persisted to file later)
let memoryStore = [];

/**
 * Initialize email transporter
 */
function initEmailTransporter() {
  // Respect configuration to avoid initializing Gmail when disabled
  if (process.env.EMAIL_ENABLED !== 'true') {
    throw new Error('Email tool is disabled by configuration (EMAIL_ENABLED != true)');
  }

  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
    debugLog('email', 'Email transporter initialized');
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

    debugLog('email', '📧 Sending email...', mailOptions);
    const info = await transporter.sendMail(mailOptions);
    debugLog('email', '✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

// Store last screenshot for email use
let lastScreenshotData = null;

/**
 * Take a screenshot of the current screen
 * @param {boolean} returnImage - If true, returns image data (for internal use)
 * @returns {Promise<Object>} Result with base64 encoded screenshot
 */
async function takeScreenshot(returnImage = false) {
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
      // Windows - using PowerShell to capture screen to file
      const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height;
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap);
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size);
        $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
        $graphics.Dispose();
        $bitmap.Dispose();
      `.replace(/\n/g, ' ');
      command = `powershell -command "${psCommand}"`;
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
      
      debugLog('tools', '✅ Screenshot captured successfully');
      
      // Store image temporarily for potential email use
      const filename = `screenshot_${new Date().toISOString().replace(/:/g, '-')}.png`;
      lastScreenshotData = { image: base64Image, filename, mimeType: 'image/png' };
      
      // If called internally (for email), return full data
      if (returnImage) {
        return { 
          success: true, 
          image: base64Image,
          mimeType: 'image/png',
          filename: filename
        };
      }
      
      // For Gemini response, return lightweight metadata only
      return { 
        success: true,
        message: `Screenshot captured successfully: ${filename}`,
        filename: filename,
        size: `${Math.round(base64Image.length / 1024)}KB`
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
  debugLog('clipboard', '✅ Text copied to clipboard');
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
  debugLog('clipboard', '✅ Retrieved clipboard text');
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
  debugLog('clipboard', '✅ Paste command executed');
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
  debugLog('memory', `💾 Memory stored: [${category}] ${content.substring(0, 50)}...`);
    
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
    
  debugLog('memory', `🔍 Memory search for "${query}": ${results.length} results`);
    
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
      debugLog('memory', `🗑️ Cleared memories in category: ${category}`);
    } else {
      memoryStore = [];
      debugLog('memory', '🗑️ Cleared all memories');
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
 * Helper to add behavior to function declaration
 */
function addBehavior(declaration, toolId) {
  if (toolAsyncSettings[toolId]) {
    declaration.behavior = 'NON_BLOCKING';
  }
  return declaration;
}

/**
 * Generate tool function declarations for Gemini API (filtered by ENABLED_TOOLS)
 * This must be called dynamically to reflect current enabled tools
 */
function getToolDeclarations() {
  const declarations = [];
  
  // Google Search - add if enabled
  if (ENABLED_TOOLS.googleSearch) {
    declarations.push({ googleSearch: {} });
  }

  // Custom tools - build function declarations array
  const functionDeclarations = [];

  if (ENABLED_TOOLS.send_email_to_shubharthak) {
    functionDeclarations.push(addBehavior({
      name: 'send_email_to_shubharthak',
      description: 'Send an email message to Shubharthak Sangharsha. Can include image attachments.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          senderInfo: { type: 'string' },
          imageBase64: { type: 'string' },
          imageFilename: { type: 'string' }
        },
        required: ['message']
      }
    }, 'send_email_to_shubharthak'));
  }

  if (ENABLED_TOOLS.take_screenshot) {
    functionDeclarations.push(addBehavior({
      name: 'take_screenshot',
      description: 'Take a screenshot of the current screen.',
      parameters: { type: 'object', properties: {} }
    }, 'take_screenshot'));
  }

  if (ENABLED_TOOLS.screenshot_and_email) {
    functionDeclarations.push(addBehavior({
      name: 'screenshot_and_email',
      description: 'Take a screenshot and immediately email it to Shubharthak.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          senderInfo: { type: 'string' }
        }
      }
    }, 'screenshot_and_email'));
  }

  if (ENABLED_TOOLS.copy_to_clipboard) {
    functionDeclarations.push(addBehavior({
      name: 'copy_to_clipboard',
      description: 'Copy text to the system clipboard.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text']
      }
    }, 'copy_to_clipboard'));
  }

  if (ENABLED_TOOLS.get_clipboard_text) {
    functionDeclarations.push(addBehavior({
      name: 'get_clipboard_text',
      description: 'Get the current text from system clipboard.',
      parameters: { type: 'object', properties: {} }
    }, 'get_clipboard_text'));
  }

  if (ENABLED_TOOLS.paste_from_clipboard) {
    functionDeclarations.push(addBehavior({
      name: 'paste_from_clipboard',
      description: 'Simulate keyboard paste (Ctrl+V/Cmd+V).',
      parameters: { type: 'object', properties: {} }
    }, 'paste_from_clipboard'));
  }

  if (ENABLED_TOOLS.store_memory) {
    functionDeclarations.push(addBehavior({
      name: 'store_memory',
      description: 'Store a memory/note for later retrieval.',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string' }, category: { type: 'string' } },
        required: ['content']
      }
    }, 'store_memory'));
  }

  if (ENABLED_TOOLS.retrieve_memories) {
    functionDeclarations.push(addBehavior({
      name: 'retrieve_memories',
      description: 'Retrieve stored memories/notes.',
      parameters: { type: 'object', properties: { query: { type: 'string' } } }
    }, 'retrieve_memories'));
  }

  if (ENABLED_TOOLS.clear_memories) {
    functionDeclarations.push(addBehavior({
      name: 'clear_memories',
      description: 'Clear memories (all or by category).',
      parameters: { type: 'object', properties: { category: { type: 'string' } } }
    }, 'clear_memories'));
  }

  // Add custom function declarations if any exist
  if (functionDeclarations.length > 0) {
    declarations.push({ functionDeclarations });
  }

  return declarations;
}

/**
 * Execute a tool function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments
 * @returns {Promise<Object>} Function result
 */
async function executeTool(functionName, args) {
  // Block execution of disabled tools as a safety net
  if (!ENABLED_TOOLS[functionName]) {
    console.warn(`🚫 Tool blocked by config: ${functionName}`);
    return { success: false, error: 'Tool disabled by configuration' };
  }

  debugLog('tools', `🔧 Executing tool: ${functionName}`, args);

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
  debugLog('tools', '📸 Taking screenshot for email...');
    
    // Step 1: Take screenshot (with returnImage=true for internal use)
    const screenshotResult = await takeScreenshot(true);
    
    if (!screenshotResult.success) {
      return { success: false, error: `Screenshot failed: ${screenshotResult.error}` };
    }
    
  debugLog('tools', '✅ Screenshot captured, now sending email...');
    
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
    
  debugLog('email', '✅ Screenshot emailed successfully');
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
  getToolDeclarations,
  executeTool,
  sendEmailToShubharthak,
  takeScreenshot,
  screenshotAndEmail,
  copyToClipboard,
  getClipboardText,
  pasteFromClipboard,
  storeMemory,
  retrieveMemories,
  clearMemories,
  getEnabledTools,
  getAllTools,
  setEnabledTools,
  setToolOrder,
  setToolAsyncSettings,
  TOOL_METADATA
};
