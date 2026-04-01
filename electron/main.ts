// electron/main.ts
import { app, BrowserWindow, Menu, Tray, nativeImage, shell, utilityProcess, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import getPort from 'get-port'
import waitOn from 'wait-on'
import { registerVaultHandlers } from './ipc/vault'
import { registerFsHandlers } from './ipc/fs'
import { registerNotifyHandlers } from './ipc/notify'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let serverChild: Electron.UtilityProcess | null = null

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Voltex Notes',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  const url = `http://127.0.0.1:${port}`
  const appUrl = `${url}/notes`
  log(`[window] Loading ${appUrl}`)
  mainWindow.loadURL(appUrl)

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`[window] did-fail-load: code=${code} desc=${desc}`)
  })

  // Allow Firebase auth popups (Google sign-in, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    log(`[window] popup requested: ${popupUrl}`)
    // Allow Firebase auth and Google OAuth popups
    if (
      popupUrl.includes('accounts.google.com') ||
      popupUrl.includes('firebaseapp.com') ||
      popupUrl.includes('googleapis.com') ||
      popupUrl.includes('127.0.0.1') ||
      popupUrl.includes('localhost')
    ) {
      return { action: 'allow' }
    }
    // Open other links in the OS default browser
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
  const iconPath = path.join(__dirname, '..', 'public', 'icon-16x16.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

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
    autoUpdater.quitAndInstall()
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

interface AppWithQuitting extends Electron.App {
  isQuitting: boolean
}

;(app as AppWithQuitting).isQuitting = false

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  // Another instance is already running — quit immediately
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
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

    try {
      const appPort = await startNextServer()
      createWindow(appPort)
      createTray()
      setupAutoUpdater()
    } catch (err) {
      log(`[ERROR] Startup failed: ${err}`)
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

app.on('before-quit', () => {
  log('[lifecycle] before-quit')
  ;(app as AppWithQuitting).isQuitting = true
  if (serverChild) serverChild.kill()
})
