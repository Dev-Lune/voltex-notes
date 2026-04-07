// electron/main.ts
import { app, BrowserWindow, Menu, Tray, nativeImage, shell, utilityProcess, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import getPort from 'get-port'
import waitOn from 'wait-on'
import Store from 'electron-store'
import { registerVaultHandlers } from './ipc/vault'
import { registerFsHandlers, setMainWindow } from './ipc/fs'
import { registerNotifyHandlers } from './ipc/notify'
import { registerAuthHandlers } from './ipc/auth'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let tray: Tray | null = null
let serverChild: Electron.UtilityProcess | null = null

// ─── Persistent settings store ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const settingsStore = new Store({ defaults: {} }) as any

// ─── Logging ──────────────────────────────────────────────────────────────────

const logFile = path.join(app.getPath('userData'), 'voltex-main.log')

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(logFile, line) } catch { /* ignore */ }
  console.log(msg)
}

// ─── Next.js Server ───────────────────────────────────────────────────────────

async function startNextServer(): Promise<number> {
  if (isDev) {
    const port = parseInt(process.env.ELECTRON_PORT || '3001', 10)
    log(`[dev] Using external Next.js dev server on port ${port}`)
    return port
  }

  const port = await getPort({ port: [3001, 3002, 3003, 3004, 3005] })
  log(`[prod] Selected port ${port}`)

  const serverScript = path.join(process.resourcesPath!, 'next-server', 'server.js')
  log(`[prod] Server script: ${serverScript}`)
  log(`[prod] Exists: ${fs.existsSync(serverScript)}`)

  if (!fs.existsSync(serverScript)) {
    const msg = `Next.js server not found at: ${serverScript}`
    log(`[ERROR] ${msg}`)
    dialog.showErrorBox('Voltex Notes — Server Missing', msg)
    app.quit()
    return port
  }

  // Use Electron's utilityProcess.fork — runs Node.js code in a proper
  // child process without spawning another Electron window
  serverChild = utilityProcess.fork(serverScript, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: path.join(process.resourcesPath!, 'next-server'),
  })

  serverChild.on('exit', (code) => {
    log(`[prod] Next.js server exited with code ${code}`)
    if (code !== 0 && !(app as AppWithQuitting).isQuitting) {
      dialog.showErrorBox('Voltex Notes', `Next.js server crashed (exit code ${code}). Check log at:\n${logFile}`)
      app.quit()
    }
  })

  log(`[prod] Waiting for server on http://127.0.0.1:${port} ...`)

  try {
    await waitOn({
      resources: [`http://127.0.0.1:${port}`],
      timeout: 30000,
    })
    log(`[prod] Server is ready on port ${port}`)
  } catch (err) {
    const msg = `Next.js server did not start within 30s.\nLog: ${logFile}`
    log(`[ERROR] waitOn timed out: ${err}`)
    dialog.showErrorBox('Voltex Notes — Startup Failed', msg)
    app.quit()
  }

  return port
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(port: number): void {
  // Restore saved window bounds
  const savedBounds = settingsStore.get('windowBounds')
  const wasMaximized = settingsStore.get('windowMaximized', false)

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1280,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Voltex Notes',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false,
  })

  // Share mainWindow ref with fs module for watcher events
  setMainWindow(mainWindow)

  if (wasMaximized) mainWindow.maximize()

  // Persist window bounds on move/resize
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return
    settingsStore.set('windowBounds', mainWindow.getBounds())
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)
  mainWindow.on('maximize', () => settingsStore.set('windowMaximized', true))
  mainWindow.on('unmaximize', () => settingsStore.set('windowMaximized', false))

  // Restore saved zoom factor
  const savedZoom = settingsStore.get('zoomFactor')
  if (savedZoom) mainWindow.webContents.setZoomFactor(savedZoom)

  // Persist zoom level changes
  mainWindow.webContents.on('zoom-changed', (_event, direction) => {
    if (!mainWindow) return
    let current = mainWindow.webContents.getZoomFactor()
    current = direction === 'in' ? current * 1.1 : current / 1.1
    current = Math.max(0.5, Math.min(3.0, current))
    mainWindow.webContents.setZoomFactor(current)
    settingsStore.set('zoomFactor', current)
  })

  // Native right-click context menu with spell check suggestions
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = []

    // Spelling suggestions
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menuItems.push({
          label: suggestion,
          click: () => mainWindow?.webContents.replaceMisspelling(suggestion),
        })
      }
      menuItems.push({ type: 'separator' })
    }

    // Standard text editing items
    if (params.isEditable) {
      menuItems.push(
        { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
        { label: 'Select All', role: 'selectAll' }
      )
    } else if (params.selectionText) {
      menuItems.push({ label: 'Copy', role: 'copy' })
    }

    if (menuItems.length > 0) {
      Menu.buildFromTemplate(menuItems).popup()
    }
  })

  const url = `http://127.0.0.1:${port}`
  const appUrl = `${url}/notes`
  log(`[window] Loading ${appUrl}`)
  mainWindow.loadURL(appUrl)

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`[window] did-fail-load: code=${code} desc=${desc}`)
  })

  // Block all popups — Google sign-in uses system browser via IPC flow
  mainWindow.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    log(`[window] popup requested: ${popupUrl}`)
    // Allow local dev URLs (hot reload, etc.)
    if (popupUrl.includes('127.0.0.1') || popupUrl.includes('localhost')) {
      return { action: 'allow' }
    }
    // Everything else opens in system default browser
    shell.openExternal(popupUrl)
    return { action: 'deny' }
  })

  // Prevent Electron from navigating to dropped files, but allow Firebase auth redirects
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    if (
      navUrl === url ||
      navUrl.includes('firebaseapp.com') ||
      navUrl.includes('accounts.google.com') ||
      navUrl.includes('googleapis.com') ||
      navUrl.startsWith(`http://127.0.0.1:${port}`)
    ) {
      return // allow
    }
    event.preventDefault()
    log(`[window] Blocked navigation to: ${navUrl}`)
  })

  mainWindow.once('ready-to-show', () => {
    log('[window] ready-to-show')
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow?.show()
  })

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!(app as AppWithQuitting).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function createTray(): void {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'icon-16x16.png')
    : path.join(process.resourcesPath!, 'next-server', 'public', 'icon-16x16.png')
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } catch {
    log(`[tray] Failed to load icon from ${iconPath}`)
    return
  }

  tray = new Tray(icon)
  tray.setToolTip('Voltex Notes')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Voltex',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: 'New Note',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('tray:new-note')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as AppWithQuitting).isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  if (isDev) return

  log('[updater] Checking for updates...')
  autoUpdater.checkForUpdatesAndNotify()

  // Check every 4 hours
  setInterval(() => {
    log('[updater] Periodic update check')
    autoUpdater.checkForUpdatesAndNotify()
  }, 4 * 60 * 60 * 1000)

  autoUpdater.on('checking-for-update', () => {
    log('[updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log(`[updater] Update available: ${info.version}`)
    mainWindow?.webContents.send('updater:update-available', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    log('[updater] No update available')
  })

  autoUpdater.on('download-progress', (progress) => {
    log(`[updater] Download progress: ${Math.round(progress.percent)}%`)
    mainWindow?.webContents.send('updater:download-progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', (info) => {
    log(`[updater] Update downloaded: ${info.version}`)
    mainWindow?.webContents.send('updater:update-ready', info.version)
  })

  autoUpdater.on('error', (err) => {
    log(`[updater] Error: ${err.message}`)
  })

  // Handle install request from renderer
  ipcMain.handle('updater:install', () => {
    log('[updater] User triggered install & restart')
    ;(app as AppWithQuitting).isQuitting = true
    try {
      autoUpdater.quitAndInstall()
    } catch (err) {
      log(`[updater] quitAndInstall failed: ${err}`)
      mainWindow?.webContents.send('updater:error', `Install failed: ${err}`)
    }
  })
}

// ─── Native Application Menu ──────────────────────────────────────────────────

function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { label: 'Preferences…', accelerator: 'Cmd+,', click: () => mainWindow?.webContents.send('menu:open-settings') },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('tray:new-note') },
        { type: 'separator' },
        { label: 'Open Vault…', click: () => mainWindow?.webContents.send('menu:open-vault') },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu:toggle-sidebar') },
        { label: 'Toggle Right Panel', accelerator: 'CmdOrCtrl+Shift+B', click: () => mainWindow?.webContents.send('menu:toggle-right-panel') },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Voltex Notes',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Voltex Notes',
              message: 'Voltex Notes',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChromium: ${process.versions.chrome}\n\n© 2026 DevLune Studios\nMIT License`,
            })
          },
        },
        { label: 'Check for Updates…', click: () => { autoUpdater.checkForUpdatesAndNotify() } },
        { type: 'separator' },
        {
          label: 'Report Issue…',
          click: () => shell.openExternal('https://github.com/DevLune/voltex-notes/issues'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─── Extra IPC Handlers ───────────────────────────────────────────────────────

function registerExtraHandlers(): void {
  // Set window title from renderer
  ipcMain.handle('window:set-title', (_event, title: string) => {
    mainWindow?.setTitle(title)
  })

  // Set window background color to match theme
  ipcMain.handle('window:set-background-color', (_event, color: string) => {
    if (mainWindow && /^#[0-9a-fA-F]{6}$/.test(color)) {
      mainWindow.setBackgroundColor(color)
    }
  })

  // App info for renderer
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-platform', () => process.platform)

  // Settings store for renderer (replaces localStorage for desktop)
  ipcMain.handle('store:get', (_event, key: string) => {
    return settingsStore.get(key)
  })
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    settingsStore.set(key, value)
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

interface AppWithQuitting extends Electron.App {
  isQuitting: boolean
}

;(app as AppWithQuitting).isQuitting = false

// Register deep link protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('voltex', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('voltex')
}

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
    // Handle deep link on Windows (protocol URL is in argv)
    const deepUrl = argv.find((a) => a.startsWith('voltex://'))
    if (deepUrl) {
      mainWindow?.webContents.send('deep-link', deepUrl)
    }
  })

  app.on('ready', async () => {
    log(`[lifecycle] app ready  isDev=${isDev}  exe=${process.execPath}`)
    log(`[lifecycle] userData=${app.getPath('userData')}`)
    log(`[lifecycle] resourcesPath=${process.resourcesPath}`)
    log(`[lifecycle] logFile=${logFile}`)

    registerVaultHandlers()
    registerFsHandlers()
    registerNotifyHandlers()
    registerAuthHandlers()
    registerExtraHandlers()

    // Show splash screen while Next.js boots
    splashWindow = new BrowserWindow({
      width: 340,
      height: 200,
      frame: false,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html><head><style>
        body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
             background:rgba(15,17,23,0.97);border-radius:16px;font-family:system-ui,-apple-system,sans-serif;
             color:#d4d8e8;flex-direction:column;gap:16px;-webkit-app-region:drag;}
        .brand{display:flex;align-items:center;gap:10px;}
        .brand svg{width:28px;height:28px;}
        .brand span{font-size:17px;font-weight:600;letter-spacing:0.3px;}
        .dots{display:flex;gap:6px;}
        .dots .dot{width:5px;height:5px;border-radius:50%;background:#3b8ef5;animation:pulse 1.2s ease-in-out infinite;}
        .dots .dot:nth-child(2){animation-delay:0.2s;}
        .dots .dot:nth-child(3){animation-delay:0.4s;}
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
      </style></head><body>
        <div class="brand">
          <svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#3b8ef5" fill-opacity="0.12"/><path d="M8 16l4-8 4 8-4 8z" fill="#3b8ef5"/><path d="M16 16l4-8 4 8-4 8z" fill="#3b8ef5" fill-opacity="0.5"/></svg>
          <span>Voltex Notes</span>
        </div>
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      </body></html>
    `)}`)

    try {
      const appPort = await startNextServer()
      createWindow(appPort)
      buildAppMenu()
      createTray()
      setupAutoUpdater()
    } catch (err) {
      log(`[ERROR] Startup failed: ${err}`)
      if (splashWindow) {
        splashWindow.destroy()
        splashWindow = null
      }
      dialog.showErrorBox('Voltex Notes — Startup Error', `${err}\n\nLog: ${logFile}`)
      app.quit()
    }
  })
}

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
})

app.on('activate', () => {
  mainWindow?.show()
})

// macOS deep link handler
app.on('open-url', (_event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url)
    mainWindow.show()
  }
})

// macOS open file handler (for .md file associations)
app.on('open-file', (_event, filePath) => {
  if (mainWindow) {
    mainWindow.webContents.send('open-file', filePath)
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  log('[lifecycle] before-quit')
  ;(app as AppWithQuitting).isQuitting = true
  if (serverChild) serverChild.kill()
})
