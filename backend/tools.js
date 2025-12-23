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
  copy_to_clipboard: false,
  get_clipboard_text: false,
  paste_from_clipboard: false,
  store_memory: false,
  retrieve_memories: false,
  clear_memories: false,
  read_file: false,
  browse_files: false,
  create_file: false,
  edit_file: false,
  move_file: false,
  rename_file: false,
  delete_file: false,
  open_url: false,
  fill_form: false,
  click_element: false
};

// Tool metadata for UI display (with async behavior support)
const TOOL_METADATA = {
  googleSearch: { name: 'Google Search', description: 'Real-time web search', async: false },
  send_email_to_shubharthak: { name: 'Send Email', description: 'Send messages with file attachments', async: true },
  take_screenshot: { name: 'Take Screenshot', description: 'Capture screen', async: true },
  copy_to_clipboard: { name: 'Copy to Clipboard', description: 'Copy text', async: true },
  get_clipboard_text: { name: 'Get Clipboard', description: 'Read clipboard text', async: false },
  paste_from_clipboard: { name: 'Paste Clipboard', description: 'Paste clipboard content', async: true },
  store_memory: { name: 'Store Memory', description: 'Save information', async: true },
  retrieve_memories: { name: 'Retrieve Memories', description: 'Recall stored info', async: false },
  clear_memories: { name: 'Clear Memories', description: 'Delete stored info', async: true },
  read_file: { name: 'Read File', description: 'Read local files (text or base64)', async: false },
  browse_files: { name: 'Browse Files', description: 'List files and directories', async: false },
  create_file: { name: 'Create File', description: 'Create new files with content', async: true },
  edit_file: { name: 'Edit File', description: 'Edit existing files', async: true },
  move_file: { name: 'Move File', description: 'Move files to new location', async: true },
  rename_file: { name: 'Rename File', description: 'Rename files', async: true },
  delete_file: { name: 'Delete File', description: 'Delete files', async: true },
  open_url: { name: 'Open URL', description: 'Open websites in browser', async: true },
  fill_form: { name: 'Fill Form', description: 'Fill web forms automatically', async: true },
  click_element: { name: 'Click Element', description: 'Click elements on websites', async: true }
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

// Memory storage - persistent to JSON file
const MEMORY_FILE = path.join(__dirname, 'apsara-memory.json');
let memoryStore = [];

// Load memories from file on startup
function loadMemories() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      memoryStore = JSON.parse(data);
      console.log(`💾 Loaded ${memoryStore.length} memories from persistent storage`);
    } else {
      console.log('💾 No existing memory file found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Error loading memories:', error);
    memoryStore = [];
  }
}

// Save memories to file
function saveMemories() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
    debugLog('memory', `💾 Saved ${memoryStore.length} memories to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving memories:', error);
  }
}

// Initialize memories on module load
loadMemories();

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
 * Send email with optional file attachment
 * @param {string} message - The message content
 * @param {string} recipientEmail - Email address to send to (defaults to Shubharthak)
 * @param {string} senderInfo - Optional sender information
 * @param {string} fileBase64 - Optional base64 encoded file (or 'use_last_screenshot')
 * @param {string} filename - Optional filename for the attachment
 * @param {string} mimeType - Optional MIME type (e.g., 'image/png', 'application/pdf')
 * @returns {Promise<Object>} Result object with success status
 */
async function sendEmailToShubharthak(message, recipientEmail = 'shubharthaksangharsha@gmail.com', senderInfo = '', fileBase64 = null, filename = 'attachment.dat', mimeType = null) {
  try {
    const transporter = initEmailTransporter();
    
    // If fileBase64 is placeholder or 'use_last_screenshot', use the stored screenshot
    if (fileBase64 === 'base64_encoded_screenshot_data' || fileBase64 === 'use_last_screenshot' || (!fileBase64 && lastScreenshotData)) {
      if (lastScreenshotData) {
        console.log('📎 Using last screenshot for email attachment');
        fileBase64 = lastScreenshotData.image;
        filename = lastScreenshotData.filename;
        mimeType = lastScreenshotData.mimeType;
      } else {
        console.warn('⚠️ No screenshot available, sending without attachment');
        fileBase64 = null;
      }
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Message from Apsara Live Assistant`,
      html: `
        <h2>New message from Apsara Live</h2>
        <p><strong>Message:</strong> ${message}</p>
        ${senderInfo ? `<p><strong>Context:</strong> ${senderInfo}</p>` : ''}
        <p><em>Sent at: ${new Date().toLocaleString()}</em></p>
      `
    };

    // Add file attachment if provided (works with any file type)
    if (fileBase64 && fileBase64 !== 'base64_encoded_screenshot_data') {
      const attachment = {
        filename: filename,
        content: fileBase64,
        encoding: 'base64'
      };
      
      // Add MIME type if provided
      if (mimeType) {
        attachment.contentType = mimeType;
      }
      
      mailOptions.attachments = [attachment];
      console.log(`📎 Attaching file: ${filename} (${mimeType || 'unknown type'})`);
    }

    console.log(`📧 Sending email to: ${recipientEmail}`);
    const info = await transporter.sendMail(mailOptions);
    debugLog('email', '✅ Email sent:', info.messageId);
    
    // Clear last screenshot after successful email
    if (lastScreenshotData) {
      lastScreenshotData = null;
      console.log('🗑️ Cleared screenshot cache');
    }
    
    return { success: true, messageId: info.messageId, sentTo: recipientEmail };
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
    saveMemories(); // Persist to file
    debugLog('memory', `💾 Memory stored: [${category}] ${content.substring(0, 50)}...`);
    
    return { 
      success: true, 
      message: `Memory stored successfully and persisted`,
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
    
    saveMemories(); // Persist to file
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
 * Read a file from the local filesystem and return its content
 * @param {string} filePath - Absolute or relative path to the file
 * @param {boolean} asBase64 - Return as base64 encoded string (useful for binary files)
 * @returns {Promise<Object>} Result with file content
 */
async function readFile(filePath, asBase64 = false) {
  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return { 
        success: false, 
        error: `File not found: ${filePath}` 
      };
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return { 
        success: false, 
        error: `Path is not a file: ${filePath}` 
      };
    }
    
    // Read file
    if (asBase64) {
      const buffer = fs.readFileSync(absolutePath);
      const base64 = buffer.toString('base64');
      const mimeType = getMimeType(path.basename(absolutePath));
      
      return {
        success: true,
        filename: path.basename(absolutePath),
        filepath: absolutePath,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        mimeType: mimeType,
        base64Content: base64,
        message: `File read successfully: ${path.basename(absolutePath)} (${Math.round(stats.size / 1024)}KB)`
      };
    } else {
      const content = fs.readFileSync(absolutePath, 'utf8');
      
      return {
        success: true,
        filename: path.basename(absolutePath),
        filepath: absolutePath,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        content: content,
        message: `File read successfully: ${path.basename(absolutePath)} (${Math.round(stats.size / 1024)}KB)`
      };
    }
  } catch (error) {
    console.error('❌ File read error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Browse files and directories in a given path
 * @param {string} dirPath - Directory path to browse (defaults to home directory)
 * @param {boolean} includeHidden - Include hidden files/folders
 * @returns {Promise<Object>} Result with directory listing
 */
async function browseFiles(dirPath = require('os').homedir(), includeHidden = false) {
  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);
    
    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      return { 
        success: false, 
        error: `Directory not found: ${dirPath}` 
      };
    }
    
    // Check if it's a directory
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return { 
        success: false, 
        error: `Path is not a directory: ${dirPath}` 
      };
    }
    
    // Read directory
    let items = fs.readdirSync(absolutePath);
    
    // Filter hidden files if requested
    if (!includeHidden) {
      items = items.filter(item => !item.startsWith('.'));
    }
    
    // Get detailed info for each item
    const itemDetails = items.map(item => {
      const itemPath = path.join(absolutePath, item);
      try {
        const itemStats = fs.statSync(itemPath);
        return {
          name: item,
          path: itemPath,
          type: itemStats.isDirectory() ? 'directory' : 'file',
          size: itemStats.isFile() ? itemStats.size : 0,
          sizeKB: itemStats.isFile() ? Math.round(itemStats.size / 1024) : 0,
          modified: itemStats.mtime.toISOString()
        };
      } catch (e) {
        return {
          name: item,
          path: itemPath,
          type: 'unknown',
          error: 'Permission denied or inaccessible'
        };
      }
    });
    
    // Sort: directories first, then files, alphabetically
    itemDetails.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    return {
      success: true,
      currentPath: absolutePath,
      parentPath: path.dirname(absolutePath),
      itemCount: itemDetails.length,
      directories: itemDetails.filter(i => i.type === 'directory').length,
      files: itemDetails.filter(i => i.type === 'file').length,
      items: itemDetails,
      message: `Found ${itemDetails.length} items in ${absolutePath}`
    };
  } catch (error) {
    console.error('❌ File browse error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Create a new file with content
 * @param {string} filePath - Path where to create the file
 * @param {string} content - Content to write to the file
 * @param {boolean} overwrite - Overwrite if file exists (default: false)
 * @returns {Promise<Object>} Result object
 */
async function createFile(filePath, content, overwrite = false) {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Check if file already exists
    if (fs.existsSync(absolutePath) && !overwrite) {
      return {
        success: false,
        error: `File already exists: ${filePath}. Set overwrite=true to replace it.`
      };
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(absolutePath, content, 'utf8');
    const stats = fs.statSync(absolutePath);
    
    return {
      success: true,
      filepath: absolutePath,
      filename: path.basename(absolutePath),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      message: `File created successfully: ${path.basename(absolutePath)} (${Math.round(stats.size / 1024)}KB)`
    };
  } catch (error) {
    console.error('❌ File create error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Edit an existing file (write or append content)
 * @param {string} filePath - Path to the file to edit
 * @param {string} content - New content or content to append
 * @param {string} mode - 'write' (replace all) or 'append' (add to end)
 * @returns {Promise<Object>} Result object
 */
async function editFile(filePath, content, mode = 'write') {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}. Use create_file to create new files.`
      };
    }
    
    // Check if it's a file
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return { success: false, error: `Path is not a file: ${filePath}` };
    }
    
    // Edit file based on mode
    if (mode === 'append') {
      fs.appendFileSync(absolutePath, content, 'utf8');
    } else {
      fs.writeFileSync(absolutePath, content, 'utf8');
    }
    
    const newStats = fs.statSync(absolutePath);
    
    return {
      success: true,
      filepath: absolutePath,
      filename: path.basename(absolutePath),
      size: newStats.size,
      sizeKB: Math.round(newStats.size / 1024),
      mode: mode,
      message: `File ${mode === 'append' ? 'appended' : 'updated'} successfully: ${path.basename(absolutePath)} (${Math.round(newStats.size / 1024)}KB)`
    };
  } catch (error) {
    console.error('❌ File edit error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Move a file to a new location
 * @param {string} sourcePath - Current file path
 * @param {string} destinationPath - New file path
 * @param {boolean} overwrite - Overwrite if destination exists (default: false)
 * @returns {Promise<Object>} Result object
 */
async function moveFile(sourcePath, destinationPath, overwrite = false) {
  try {
    const absoluteSource = path.isAbsolute(sourcePath) ? sourcePath : path.resolve(sourcePath);
    const absoluteDestination = path.isAbsolute(destinationPath) ? destinationPath : path.resolve(destinationPath);
    
    // Check if source exists
    if (!fs.existsSync(absoluteSource)) {
      return { success: false, error: `Source file not found: ${sourcePath}` };
    }
    
    // Check if destination exists
    if (fs.existsSync(absoluteDestination) && !overwrite) {
      return {
        success: false,
        error: `Destination already exists: ${destinationPath}. Set overwrite=true to replace it.`
      };
    }
    
    // Create destination directory if needed
    const destDir = path.dirname(absoluteDestination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Move file
    fs.renameSync(absoluteSource, absoluteDestination);
    const stats = fs.statSync(absoluteDestination);
    
    return {
      success: true,
      from: absoluteSource,
      to: absoluteDestination,
      filename: path.basename(absoluteDestination),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      message: `File moved successfully: ${path.basename(absoluteSource)} → ${path.basename(absoluteDestination)}`
    };
  } catch (error) {
    console.error('❌ File move error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rename a file
 * @param {string} filePath - Current file path
 * @param {string} newName - New filename (not full path)
 * @returns {Promise<Object>} Result object
 */
async function renameFile(filePath, newName) {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    
    // Create new path with same directory
    const dir = path.dirname(absolutePath);
    const newPath = path.join(dir, newName);
    
    // Check if new name already exists
    if (fs.existsSync(newPath)) {
      return {
        success: false,
        error: `A file with name "${newName}" already exists in this directory.`
      };
    }
    
    // Rename file
    fs.renameSync(absolutePath, newPath);
    const stats = fs.statSync(newPath);
    
    return {
      success: true,
      oldPath: absolutePath,
      newPath: newPath,
      oldName: path.basename(absolutePath),
      newName: newName,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      message: `File renamed successfully: ${path.basename(absolutePath)} → ${newName}`
    };
  } catch (error) {
    console.error('❌ File rename error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a file
 * @param {string} filePath - Path to file to delete
 * @param {boolean} confirm - Safety confirmation (must be true)
 * @returns {Promise<Object>} Result object
 */
async function deleteFile(filePath, confirm = false) {
  try {
    // Safety check - require explicit confirmation
    if (!confirm) {
      return {
        success: false,
        error: 'Deletion requires confirmation. Set confirm=true to delete the file.'
      };
    }
    
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return {
        success: false,
        error: `Path is not a file: ${filePath}. Use a directory deletion tool for directories.`
      };
    }
    
    const filename = path.basename(absolutePath);
    const size = Math.round(stats.size / 1024);
    
    // Delete file
    fs.unlinkSync(absolutePath);
    
    return {
      success: true,
      deletedFile: filename,
      deletedPath: absolutePath,
      size: stats.size,
      sizeKB: size,
      message: `File deleted successfully: ${filename} (${size}KB)`
    };
  } catch (error) {
    console.error('❌ File delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Open a URL in the default browser
 * @param {string} url - URL to open
 * @returns {Promise<Object>} Result object
 */
async function openUrl(url) {
  try {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const platform = process.platform;
    let command;
    
    if (platform === 'linux') {
      command = `xdg-open "${url}"`;
    } else if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "" "${url}"`;
    } else {
      return { success: false, error: 'Unsupported platform' };
    }
    
    await execAsync(command);
    
    return {
      success: true,
      url: url,
      message: `Opened URL in browser: ${url}`
    };
  } catch (error) {
    console.error('❌ URL open error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fill a web form (opens URL with pre-filled query parameters)
 * @param {string} url - Base URL to fill form on
 * @param {Object} formData - Object with field names and values
 * @returns {Promise<Object>} Result object
 */
async function fillForm(url, formData = {}) {
  try {
    // Note: This is a simplified implementation that constructs a URL with query parameters
    // For complex form filling, consider using Puppeteer or Playwright
    
    if (!url) {
      return { success: false, error: 'URL is required' };
    }
    
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Build query string from form data
    const queryParams = new URLSearchParams(formData).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;
    
    // Open the URL with pre-filled parameters
    const result = await openUrl(fullUrl);
    
    if (result.success) {
      return {
        success: true,
        url: fullUrl,
        formData: formData,
        message: `Opened form URL with pre-filled data: ${fullUrl}`,
        note: 'For advanced form automation, consider using browser automation tools'
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Form fill error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Click an element on a website (simulates browser automation)
 * @param {string} url - URL of the website
 * @param {string} selector - CSS selector or element description
 * @returns {Promise<Object>} Result object
 */
async function clickElement(url, selector) {
  try {
    // Note: This is a placeholder implementation
    // For real browser automation, use Puppeteer, Playwright, or Selenium
    
    if (!url) {
      return { success: false, error: 'URL is required' };
    }
    
    if (!selector) {
      return { success: false, error: 'Element selector is required' };
    }
    
    // For now, just open the URL and inform the user
    await openUrl(url);
    
    return {
      success: true,
      url: url,
      selector: selector,
      message: `Opened ${url}. To click element "${selector}", please use browser automation tools like Puppeteer.`,
      note: 'This is a simplified implementation. For production use, integrate Puppeteer or Playwright for headless browser automation.'
    };
  } catch (error) {
    console.error('❌ Click element error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get MIME type from filename
 * @param {string} filename
 * @returns {string} MIME type
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav'
  };
  return mimeTypes[ext] || 'application/octet-stream';
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
      description: 'Send an email to any recipient with optional file attachment. WORKFLOWS: (1) Screenshot: call take_screenshot, then this with fileBase64="use_last_screenshot". (2) Any file: call read_file with asBase64=true, then this with fileBase64=result.base64Content, filename=result.filename, mimeType=result.mimeType.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Email message content' },
          recipientEmail: { type: 'string', description: 'Email address to send to (defaults to shubharthaksangharsha@gmail.com)' },
          senderInfo: { type: 'string', description: 'Optional context or sender information' },
          fileBase64: { type: 'string', description: 'Base64 encoded file content OR "use_last_screenshot". Get this from read_file result.base64Content or take_screenshot.' },
          filename: { type: 'string', description: 'Filename for attachment (e.g., start.sh, document.pdf). Get from read_file result.filename.' },
          mimeType: { type: 'string', description: 'MIME type (e.g., text/plain, application/pdf). Get from read_file result.mimeType.' }
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

  if (ENABLED_TOOLS.read_file) {
    functionDeclarations.push(addBehavior({
      name: 'read_file',
      description: 'Read a file from the local filesystem. Returns file content as text OR base64. TO EMAIL A FILE: Use asBase64=true, then pass result.base64Content to send_email_to_shubharthak with result.filename and result.mimeType.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Absolute or relative path to the file (e.g., /home/user/start.sh or ./backend/start.sh)' },
          asBase64: { type: 'boolean', description: 'REQUIRED for email: true = returns base64Content (for attachments), false = returns text content (for reading). Set to true when emailing files.' }
        },
        required: ['filePath']
      }
    }, 'read_file'));
  }

  if (ENABLED_TOOLS.browse_files) {
    functionDeclarations.push(addBehavior({
      name: 'browse_files',
      description: 'Browse and list files and directories in a given path. Shows directories and files with details.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory path to browse (defaults to user home directory)' },
          includeHidden: { type: 'boolean', description: 'Include hidden files/folders (default: false)' }
        }
      }
    }, 'browse_files'));
  }

  if (ENABLED_TOOLS.create_file) {
    functionDeclarations.push(addBehavior({
      name: 'create_file',
      description: 'Create a new file with content. Automatically creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path where to create the file (e.g., /home/user/notes.txt)' },
          content: { type: 'string', description: 'Content to write to the file' },
          overwrite: { type: 'boolean', description: 'Overwrite if file exists (default: false)' }
        },
        required: ['filePath', 'content']
      }
    }, 'create_file'));
  }

  if (ENABLED_TOOLS.edit_file) {
    functionDeclarations.push(addBehavior({
      name: 'edit_file',
      description: 'Edit an existing file. Can replace entire content or append to the end.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file to edit' },
          content: { type: 'string', description: 'New content or content to append' },
          mode: { type: 'string', description: 'Edit mode: "write" (replace all) or "append" (add to end). Default: "write"' }
        },
        required: ['filePath', 'content']
      }
    }, 'edit_file'));
  }

  if (ENABLED_TOOLS.move_file) {
    functionDeclarations.push(addBehavior({
      name: 'move_file',
      description: 'Move a file to a new location. Can also be used to move files between directories.',
      parameters: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string', description: 'Current file path' },
          destinationPath: { type: 'string', description: 'New file path (full path with filename)' },
          overwrite: { type: 'boolean', description: 'Overwrite if destination exists (default: false)' }
        },
        required: ['sourcePath', 'destinationPath']
      }
    }, 'move_file'));
  }

  if (ENABLED_TOOLS.rename_file) {
    functionDeclarations.push(addBehavior({
      name: 'rename_file',
      description: 'Rename a file (stays in same directory). For moving to different directory, use move_file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Current file path' },
          newName: { type: 'string', description: 'New filename (just the name, not full path)' }
        },
        required: ['filePath', 'newName']
      }
    }, 'rename_file'));
  }

  if (ENABLED_TOOLS.delete_file) {
    functionDeclarations.push(addBehavior({
      name: 'delete_file',
      description: 'Delete a file (PERMANENT). Requires confirmation=true for safety. Ask user before calling.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file to delete' },
          confirm: { type: 'boolean', description: 'Safety confirmation - MUST be true to delete. Always ask user first!' }
        },
        required: ['filePath', 'confirm']
      }
    }, 'delete_file'));
  }

  if (ENABLED_TOOLS.open_url) {
    functionDeclarations.push(addBehavior({
      name: 'open_url',
      description: 'Open a URL in the default web browser. Automatically adds https:// if missing.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to open (e.g., google.com or https://github.com)' }
        },
        required: ['url']
      }
    }, 'open_url'));
  }

  if (ENABLED_TOOLS.fill_form) {
    functionDeclarations.push(addBehavior({
      name: 'fill_form',
      description: 'Open a web form with pre-filled query parameters. Useful for search forms, contact forms, etc.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Base URL of the form' },
          formData: { 
            type: 'object', 
            description: 'Object with field names as keys and values to fill (e.g., {"search": "query", "email": "user@example.com"})' 
          }
        },
        required: ['url', 'formData']
      }
    }, 'fill_form'));
  }

  if (ENABLED_TOOLS.click_element) {
    functionDeclarations.push(addBehavior({
      name: 'click_element',
      description: 'Open a website and prepare to interact with a specific element (for basic automation).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the website' },
          selector: { type: 'string', description: 'CSS selector or description of element to click (e.g., "#submit-button" or "login button")' }
        },
        required: ['url', 'selector']
      }
    }, 'click_element'));
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
          args.recipientEmail,
          args.senderInfo,
          args.fileBase64,
          args.filename,
          args.mimeType
        );
      
      case 'take_screenshot':
        return await takeScreenshot();
      
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
      
      case 'read_file':
        return await readFile(args.filePath, args.asBase64);
      
      case 'browse_files':
        return await browseFiles(args.dirPath, args.includeHidden);
      
      case 'create_file':
        return await createFile(args.filePath, args.content, args.overwrite);
      
      case 'edit_file':
        return await editFile(args.filePath, args.content, args.mode);
      
      case 'move_file':
        return await moveFile(args.sourcePath, args.destinationPath, args.overwrite);
      
      case 'rename_file':
        return await renameFile(args.filePath, args.newName);
      
      case 'delete_file':
        return await deleteFile(args.filePath, args.confirm);
      
      case 'open_url':
        return await openUrl(args.url);
      
      case 'fill_form':
        return await fillForm(args.url, args.formData);
      
      case 'click_element':
        return await clickElement(args.url, args.selector);
      
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
      screenshotResult.filename,
      screenshotResult.mimeType
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
  readFile,
  browseFiles,
  createFile,
  editFile,
  moveFile,
  renameFile,
  deleteFile,
  openUrl,
  getEnabledTools,
  getAllTools,
  setEnabledTools,
  setToolOrder,
  setToolAsyncSettings,
  TOOL_METADATA
};
