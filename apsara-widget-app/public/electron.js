const { app, BrowserWindow, screen, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');

const isDev = require('electron-is-dev');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';


let mainWindow;
let borderWindow = null; // Fullscreen red border overlay
let dropdownWindow = null; // Dropdown menu popup window


function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 580;
  const windowHeight = 120;

  let x, y;

  if (isWindows) {
    // ✅ WINDOWS FIX: force safe on-screen bottom-right
    x = Math.max(0, screenWidth - windowWidth - 20);
    y = Math.max(0, screenHeight - windowHeight - 20);
  } else {
    // ✅ LINUX / MAC: keep your original behavior
    x = screenWidth - windowWidth - 20;
    y = screenHeight - windowHeight - 20;
  }

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    focusable: true,
    show: isWindows, // ✅ WINDOWS: show immediately; LINUX/MAC: hide until ready
    // Make transparent on all platforms for borderless look
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: isWindows ? 'screen-saver' : true,
    skipTaskbar: isWindows ? false : true,
    resizable: false,
    // Shadow only on macOS for native look
    hasShadow: isMac,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      sandbox: false,
      offscreen: false
    }
  });

  // 🔐 Screen capture permissions
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === 'media') callback(true);
      else callback(false);
    }
  );

  ipcMain.handle('get-screen-sources', async () => {
    return desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 }
    });
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3001'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // ✅ LINUX/MAC ONLY: Show window when ready to prevent white flash
  if (!isWindows) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      console.log('✅ Window shown after content loaded (no white flash)');
    });

    // Backup: Show window after 500ms if ready-to-show hasn't fired
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
        console.log('✅ Window shown via timeout fallback');
      }
    }, 500);
  } else {
    // ✅ WINDOWS: Already visible, just ensure focus
    mainWindow.once('ready-to-show', () => {
      mainWindow.focus();
      console.log('✅ Windows - Window focused after ready');
    });
  }

  // Accept an optional payload { forceQuit: true } to force close/quit
  ipcMain.on('close-window', (event, args) => {
    if (!mainWindow) return;

    const forceQuit = args && (args.forceQuit === true || args.quit === true);

    if (isWindows) {
      if (forceQuit) {
        // If renderer requested a force quit, close and quit
        try {
          mainWindow.close();
        } catch (err) {
          console.error('Error closing window:', err);
        }
        app.quit();
      } else {
        // Default Windows behavior: hide instead of quitting
        mainWindow.hide();
      }
    } else {
      // Linux/macOS: normal quit
      mainWindow.close();
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setIgnoreMouseEvents(false);

  // 🪟 WINDOWS ONLY: prevent auto-dismiss on blur
if (isWindows) {
  mainWindow.on('blur', () => {
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      !mainWindow.isVisible()
    ) {
      mainWindow.showInactive();
    }
  });
}



  // Window will be shown via 'ready-to-show' event (no white flash)
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
  const expandedHeight = 600; // Increased for tools panel (was 450, then 550)

  const display = screen.getPrimaryDisplay().workAreaSize;
  const maxY = display.height - normalHeight - 20;

  const currentBounds = mainWindow.getBounds();
  const heightDiff = expandedHeight - normalHeight;

  if (show) {
    // Expand UPWARD
    const newY = isWindows
      ? clamp(currentBounds.y - heightDiff, 0, maxY)
      : currentBounds.y - heightDiff;

    mainWindow.setBounds(
      {
        x: currentBounds.x,
        y: newY,
        width: windowWidth,
        height: expandedHeight
      },
      true
    );

    console.log(`✅ Window expanded upward at (${currentBounds.x}, ${newY})`);
  } else {
    // Restore DOWNWARD — but clamp on Windows
    const newY = isWindows
      ? clamp(currentBounds.y + heightDiff, 0, maxY)
      : currentBounds.y + heightDiff;

    mainWindow.setBounds(
      {
        x: currentBounds.x,
        y: newY,
        width: windowWidth,
        height: normalHeight
      },
      true
    );

    console.log(`✅ Window restored to normal at (${currentBounds.x}, ${newY})`);
  }
});


app.on('ready', createWindow);

app.on('window-all-closed', () => {
  destroyBorderOverlay();

  if (dropdownWindow) {
    dropdownWindow.close();
    dropdownWindow = null;
  }

  // ❌ DO NOT quit on Windows (causes flash-disappear bug)
  if (!isWindows) {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
