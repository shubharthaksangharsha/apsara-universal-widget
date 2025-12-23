const { app, BrowserWindow, screen, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let borderWindow = null; // Fullscreen red border overlay
let dropdownWindow = null; // Dropdown menu popup window

function createWindow() {
  // Get primary display size
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // Widget dimensions - increased width to fit all buttons
  const windowWidth = 580;
  const windowHeight = 120; // Normal height, will expand when dropdown opens
  
  // Position in bottom-right corner
  const x = screenWidth - windowWidth - 20;
  const y = screenHeight - windowHeight - 20;
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,           // No window frame (borderless)
    transparent: true,       // Transparent background
    alwaysOnTop: true,      // Always stay on top
    skipTaskbar: true,      // Don't show in taskbar
    resizable: false,       // Can't resize
    hasShadow: false,       // No shadow for cleaner look
    enableLargerThanScreen: true, // Allow content larger than screen
    webPreferences: {
      nodeIntegration: true,   // Enable node integration for close button
      contextIsolation: false, // Disable context isolation for easier IPC
      enableRemoteModule: true, // Enable remote module
      sandbox: false,          // Disable sandbox to avoid SUID issues
      offscreen: false,        // Ensure on-screen rendering
    },
  });

  // Enable screen sharing permissions for Electron
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Allow screen capture
    } else {
      callback(false);
    }
  });

  // Handle screen sharing source selection for Electron
  ipcMain.handle('get-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 }
    });
    return sources;
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3001'  // Updated port
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Listen for close request from renderer
  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
    // Quit the entire app
    app.quit();
  });

  // Open DevTools in development (optional)
  if (isDev) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Make window draggable
  mainWindow.setIgnoreMouseEvents(false);
}

// Create fullscreen red border overlay
function createBorderOverlay() {
  if (borderWindow) return; // Already exists
  
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().bounds;
  
  borderWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
    },
  });
  
  // Make the window click-through (so user can interact with desktop)
  borderWindow.setIgnoreMouseEvents(true);
  
  // Load HTML with red border
  borderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body {
            width: 100vw;
            height: 100vh;
            background: transparent;
            border: 5px solid #ff0000;
            box-sizing: border-box;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { border-color: #ff0000; border-width: 5px; }
            50% { border-color: #ff3333; border-width: 8px; }
          }
        </style>
      </head>
      <body></body>
    </html>
  `)}`);
  
  console.log('✅ Red border overlay created');
}

// Destroy fullscreen red border overlay
function destroyBorderOverlay() {
  if (borderWindow) {
    borderWindow.close();
    borderWindow = null;
    console.log('❌ Red border overlay destroyed');
  }
}

// Handle IPC messages for border overlay
ipcMain.on('show-screen-border', () => {
  createBorderOverlay();
});

ipcMain.on('hide-screen-border', () => {
  destroyBorderOverlay();
});

// Create dropdown menu popup window
function createDropdownWindow(x, y, width, height, htmlContent) {
  // Close existing dropdown if any
  if (dropdownWindow) {
    dropdownWindow.close();
    dropdownWindow = null;
  }
  
  dropdownWindow = new BrowserWindow({
    width: width,
    height: height,
    x: Math.round(x),
    y: Math.round(y),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  dropdownWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  
  console.log(`✅ Dropdown window created at (${x}, ${y}) with size ${width}x${height}`);
  
  return dropdownWindow;
}

// Handle dropdown window creation
ipcMain.handle('create-dropdown-window', async (event, { x, y, width, height, htmlContent }) => {
  createDropdownWindow(x, y, width, height, htmlContent);
  return true;
});

// Handle dropdown window destruction
ipcMain.on('close-dropdown-window', () => {
  if (dropdownWindow) {
    dropdownWindow.close();
    dropdownWindow = null;
    console.log('❌ Dropdown window closed');
  }
});

// Send selection back to main window
ipcMain.on('dropdown-selection', (event, selection) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('dropdown-selection', selection);
  }
  // Close dropdown after selection
  if (dropdownWindow) {
    dropdownWindow.close();
    dropdownWindow = null;
  }
});

// Handle main window resize for dropdown
ipcMain.on('resize-for-dropdown', (event, { show }) => {
  if (!mainWindow) return;
  
  const windowWidth = 580;
  const normalHeight = 120;
  const expandedHeight = 450;
  
  // Get CURRENT window position (preserve wherever user dragged it)
  const currentBounds = mainWindow.getBounds();
  
  if (show) {
    // Expand window UPWARD - keep bottom position fixed, only expand top
    const heightDiff = expandedHeight - normalHeight;
    
    // Move up by the height difference to expand upward
    mainWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y - heightDiff,
      width: windowWidth,
      height: expandedHeight
    }, true); // animate = true
    
    console.log(`✅ Window expanded upward for dropdown: ${windowWidth}x${expandedHeight} at (${currentBounds.x}, ${currentBounds.y - heightDiff})`);
  } else {
    // Restore original size - move back down to restore bottom position
    const heightDiff = expandedHeight - normalHeight;
    
    mainWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y + heightDiff,
      width: windowWidth,
      height: normalHeight
    }, true); // animate = true
    
    console.log(`✅ Window restored to normal: ${windowWidth}x${normalHeight} at (${currentBounds.x}, ${currentBounds.y + heightDiff})`);
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Cleanup border overlay
  destroyBorderOverlay();
  // Cleanup dropdown window
  if (dropdownWindow) {
    dropdownWindow.close();
    dropdownWindow = null;
  }
  // Always quit the app when all windows are closed
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
