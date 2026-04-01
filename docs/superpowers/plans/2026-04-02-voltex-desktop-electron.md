# Voltex Desktop — Electron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `voltex-desktop/` — a standalone Electron desktop app wrapping the Voltex Notes Next.js app with local vault storage (Obsidian-style), system tray, OS notifications, and auto-updates.

**Architecture:** Electron main process starts a Next.js standalone server on a dynamic port; renderer loads `http://localhost:<port>`. All native operations (file I/O, vault management, tray, notifications) go through a context bridge IPC API exposed as `window.electronAPI`. The web app (`ObsidianClone/`) is never touched.

**Tech Stack:** Electron 33, Next.js 16 (standalone output), electron-builder, electron-updater, electron-store, chokidar, gray-matter, esbuild, get-port, wait-on, concurrently

---

## File Map

**New project root: `voltex-desktop/` (sibling to `ObsidianClone/` on Desktop)**

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Create | All deps + electron scripts |
| `next.config.mjs` | Create (modified copy) | standalone output mode |
| `tsconfig.json` | Create (modified copy) | exclude electron/ from Next.js |
| `tsconfig.electron.json` | Create | TS config for electron/ compilation |
| `scripts/electron-build.mjs` | Create | esbuild script for electron/ files |
| `electron-builder.yml` | Create | Packaging for Windows + Linux |
| `.github/workflows/release.yml` | Create | CI/CD publish to GitHub Releases |
| `electron/main.ts` | Create | App lifecycle, server, window, tray, updater |
| `electron/preload.ts` | Create | Context bridge — exposes IPC to renderer |
| `electron/ipc/vault.ts` | Create | Vault open/create/recent IPC handlers |
| `electron/ipc/fs.ts` | Create | File read/write/watch IPC handlers |
| `electron/ipc/notify.ts` | Create | OS notification helpers |
| `electron/types.d.ts` | Create | `window.electronAPI` type declarations |
| `lib/vault/client.ts` | Create | Renderer-side IPC wrappers |
| `lib/vault/serializer.ts` | Create | Note ↔ markdown/frontmatter conversion |
| `components/obsidian/data.ts` | Modify | Add `filePath?: string` to `Note` |
| `lib/firebase/sync.ts` | Modify | Exclude `filePath` from Firestore |
| `components/obsidian/ObsidianApp.tsx` | Modify | Vault detection, load from disk, save to disk |

All other files (`app/`, `components/`, `lib/firebase/`, `public/`, etc.) are copied verbatim from `ObsidianClone/`.

---

## Task 1: Scaffold voltex-desktop project

**Files:**
- Create: `voltex-desktop/package.json`
- Create: `voltex-desktop/next.config.mjs`
- Create: `voltex-desktop/tsconfig.json`
- Create: `voltex-desktop/tsconfig.electron.json`

- [ ] **Step 1: Create the voltex-desktop directory and copy web app files**

```bash
# Run from C:\Users\sidharth\Desktop
mkdir voltex-desktop
cd voltex-desktop

# Copy all web app source (adjust path separator for your shell)
cp -r ../ObsidianClone/app ./app
cp -r ../ObsidianClone/components ./components
cp -r ../ObsidianClone/lib ./lib
cp -r ../ObsidianClone/public ./public
cp ../ObsidianClone/tailwind.config.ts ./tailwind.config.ts
cp ../ObsidianClone/postcss.config.mjs ./postcss.config.mjs
cp ../ObsidianClone/eslint.config.mjs ./eslint.config.mjs
cp ../ObsidianClone/.env.example ./.env.example
cp ../ObsidianClone/.gitignore ./.gitignore
```

- [ ] **Step 2: Create package.json**

Create `voltex-desktop/package.json`:

```json
{
  "name": "voltex-desktop",
  "version": "1.0.0",
  "description": "Voltex Notes — Desktop App",
  "author": "DevLune Studios <sidharth@devlune.in>",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "electron:compile": "node scripts/electron-build.mjs",
    "electron:dev": "concurrently -k -n NEXT,ELECTRON \"next dev -p 3001\" \"wait-on http://localhost:3001 && cross-env NODE_ENV=development ELECTRON_PORT=3001 electron dist-electron/main.js\"",
    "electron:build": "next build && node scripts/electron-build.mjs && electron-builder",
    "electron:publish": "next build && node scripts/electron-build.mjs && electron-builder --publish always"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-accordion": "1.2.12",
    "@radix-ui/react-alert-dialog": "1.1.15",
    "@radix-ui/react-aspect-ratio": "1.1.8",
    "@radix-ui/react-avatar": "1.1.11",
    "@radix-ui/react-checkbox": "1.3.3",
    "@radix-ui/react-collapsible": "1.1.12",
    "@radix-ui/react-context-menu": "2.2.16",
    "@radix-ui/react-dialog": "1.1.15",
    "@radix-ui/react-dropdown-menu": "2.1.16",
    "@radix-ui/react-hover-card": "1.1.15",
    "@radix-ui/react-label": "2.1.8",
    "@radix-ui/react-menubar": "1.1.16",
    "@radix-ui/react-navigation-menu": "1.2.14",
    "@radix-ui/react-popover": "1.1.15",
    "@radix-ui/react-progress": "1.1.8",
    "@radix-ui/react-radio-group": "1.3.8",
    "@radix-ui/react-scroll-area": "1.2.10",
    "@radix-ui/react-select": "2.2.6",
    "@radix-ui/react-separator": "1.1.8",
    "@radix-ui/react-slider": "1.3.6",
    "@radix-ui/react-slot": "1.2.4",
    "@radix-ui/react-switch": "1.2.6",
    "@radix-ui/react-tabs": "1.1.13",
    "@radix-ui/react-toast": "1.2.15",
    "@radix-ui/react-toggle": "1.1.10",
    "@radix-ui/react-toggle-group": "1.1.11",
    "@radix-ui/react-tooltip": "1.2.8",
    "autoprefixer": "^10.4.20",
    "chokidar": "^4.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "1.1.1",
    "date-fns": "4.1.0",
    "diff": "^8.0.4",
    "dompurify": "^3.3.3",
    "electron-store": "^10.0.0",
    "electron-updater": "^6.3.9",
    "embla-carousel-react": "8.6.0",
    "firebase": "^12.11.0",
    "get-port": "^7.1.0",
    "gray-matter": "^4.0.3",
    "input-otp": "1.4.2",
    "jszip": "^3.10.1",
    "lucide-react": "^0.564.0",
    "mermaid": "^11.13.0",
    "next": "16.2.0",
    "next-themes": "^0.4.6",
    "react": "19.2.4",
    "react-day-picker": "9.13.2",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.54.1",
    "react-resizable-panels": "^2.1.7",
    "recharts": "2.15.0",
    "sonner": "^1.7.1",
    "tailwind-merge": "^3.3.1",
    "vaul": "^1.1.2",
    "wait-on": "^8.0.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.0",
    "@types/diff": "^7.0.2",
    "@types/dompurify": "^3.0.5",
    "@types/gray-matter": "^4.0.6",
    "@types/node": "^22",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@types/wait-on": "^5.3.4",
    "concurrently": "^9.1.2",
    "cross-env": "^7.0.3",
    "esbuild": "^0.25.0",
    "electron": "^33.3.1",
    "electron-builder": "^25.1.8",
    "postcss": "^8.5",
    "tailwindcss": "^4.2.0",
    "tw-animate-css": "1.3.3",
    "typescript": "5.7.3"
  }
}
```

- [ ] **Step 3: Create next.config.mjs (standalone output)**

Create `voltex-desktop/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 4: Create tsconfig.json (exclude electron/ from Next.js compiler)**

Create `voltex-desktop/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "electron", "dist-electron"]
}
```

- [ ] **Step 5: Create tsconfig.electron.json**

Create `voltex-desktop/tsconfig.electron.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist-electron",
    "rootDir": "electron",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["electron/**/*"]
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd voltex-desktop
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
cd voltex-desktop
git init
git add .
git commit -m "feat: scaffold voltex-desktop project"
```

---

## Task 2: Create esbuild script for Electron

**Files:**
- Create: `voltex-desktop/scripts/electron-build.mjs`

- [ ] **Step 1: Create scripts/electron-build.mjs**

```js
// scripts/electron-build.mjs
import { build } from 'esbuild'
import { mkdir } from 'fs/promises'

await mkdir('dist-electron', { recursive: true })

// Bundle main process (includes ipc/ modules)
await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: [
    'electron',
    'chokidar',
    'electron-store',
    'electron-updater',
    'get-port',
    'wait-on',
  ],
  outfile: 'dist-electron/main.js',
  format: 'cjs',
})

// Bundle preload separately (renderer context)
await build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outfile: 'dist-electron/preload.js',
  format: 'cjs',
})

console.log('Electron build complete.')
```

- [ ] **Step 2: Verify the script runs (will fail until electron/ files exist — that's OK)**

```bash
node scripts/electron-build.mjs
```

Expected: error like `Cannot resolve electron/main.ts` — that's fine, confirms esbuild is installed.

- [ ] **Step 3: Commit**

```bash
git add scripts/electron-build.mjs
git commit -m "feat: add esbuild script for electron compilation"
```

---

## Task 3: Create Electron type declarations

**Files:**
- Create: `voltex-desktop/electron/types.d.ts`

- [ ] **Step 1: Create electron/types.d.ts**

This file is included by the Next.js TypeScript compiler (via tsconfig.json `include: **/*.ts`) so `window.electronAPI` is typed in all renderer code.

```typescript
// electron/types.d.ts

export interface RecentVault {
  path: string;
  name: string;
  lastOpened: number;
}

export interface ElectronAPI {
  vault: {
    open: () => Promise<string | null>;
    create: (name: string, parentPath: string) => Promise<string>;
    listRecent: () => Promise<RecentVault[]>;
    setRecent: (vaultPath: string) => Promise<void>;
  };
  fs: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    listFiles: (vaultPath: string) => Promise<string[]>;
    deleteFile: (filePath: string) => Promise<void>;
    renameFile: (oldPath: string, newPath: string) => Promise<void>;
    onFileChanged: (callback: (filePath: string) => void) => () => void;
  };
  notify: {
    send: (title: string, body: string) => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/types.d.ts
git commit -m "feat: add window.electronAPI type declarations"
```

---

## Task 4: Create IPC handlers — vault

**Files:**
- Create: `voltex-desktop/electron/ipc/vault.ts`

- [ ] **Step 1: Create electron/ipc/vault.ts**

```typescript
// electron/ipc/vault.ts
import { ipcMain, dialog, app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import Store from 'electron-store'
import type { RecentVault } from '../types'

const store = new Store<{ recentVaults: RecentVault[] }>({
  defaults: { recentVaults: [] },
})

export function registerVaultHandlers(): void {
  // Show native folder picker
  ipcMain.handle('vault:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Vault Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Create a new vault folder
  ipcMain.handle('vault:create', async (_event, name: string, parentPath: string) => {
    const vaultPath = path.join(parentPath, name)
    if (!existsSync(vaultPath)) {
      mkdirSync(vaultPath, { recursive: true })
    }
    // Create .trash folder
    mkdirSync(path.join(vaultPath, '.trash'), { recursive: true })
    return vaultPath
  })

  // List recent vaults (sorted newest first)
  ipcMain.handle('vault:list-recent', () => {
    return store.get('recentVaults', []).sort((a, b) => b.lastOpened - a.lastOpened)
  })

  // Save a vault to recent list (upsert by path)
  ipcMain.handle('vault:set-recent', (_event, vaultPath: string) => {
    const existing = store.get('recentVaults', []).filter((v) => v.path !== vaultPath)
    const entry: RecentVault = {
      path: vaultPath,
      name: path.basename(vaultPath),
      lastOpened: Date.now(),
    }
    store.set('recentVaults', [entry, ...existing].slice(0, 10)) // keep 10 max
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/vault.ts
git commit -m "feat: add vault IPC handlers (open, create, recent)"
```

---

## Task 5: Create IPC handlers — filesystem

**Files:**
- Create: `voltex-desktop/electron/ipc/fs.ts`

- [ ] **Step 1: Create electron/ipc/fs.ts**

```typescript
// electron/ipc/fs.ts
import { ipcMain, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import chokidar, { FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null

/** Recursively collect all .md file paths under a directory */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // skip .trash, .git, hidden
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

export function registerFsHandlers(): void {
  ipcMain.handle('fs:read-file', (_event, filePath: string) => {
    return readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('fs:write-file', (_event, filePath: string, content: string) => {
    const dir = path.dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs:list-files', (_event, vaultPath: string) => {
    if (!existsSync(vaultPath)) return []
    return collectMarkdownFiles(vaultPath)
  })

  ipcMain.handle('fs:delete-file', (_event, filePath: string) => {
    // Move to .trash folder inside vault
    const vaultPath = filePath.split(path.sep).slice(0, -1)
    // Walk up to find vault root by looking for .trash sibling
    let dir = path.dirname(filePath)
    let trashDir = path.join(dir, '.trash')
    // Traverse up to find vault root (has .trash at top level)
    let current = filePath
    while (current !== path.dirname(current)) {
      current = path.dirname(current)
      const candidate = path.join(current, '.trash')
      if (existsSync(candidate)) {
        trashDir = candidate
        break
      }
    }
    if (!existsSync(trashDir)) mkdirSync(trashDir, { recursive: true })
    const dest = path.join(trashDir, path.basename(filePath))
    renameSync(filePath, dest)
  })

  ipcMain.handle('fs:rename-file', (_event, oldPath: string, newPath: string) => {
    const dir = path.dirname(newPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    renameSync(oldPath, newPath)
  })

  // Start watching vault folder; sends 'fs:file-changed' to renderer on changes
  ipcMain.handle('fs:watch', (_event, vaultPath: string) => {
    if (watcher) watcher.close()
    watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[/\\])\../, // ignore hidden files
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    })
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    watcher.on('change', (changedPath) => {
      win.webContents.send('fs:file-changed', changedPath)
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/fs.ts
git commit -m "feat: add filesystem IPC handlers (read, write, list, delete, watch)"
```

---

## Task 6: Create IPC handlers — notifications

**Files:**
- Create: `voltex-desktop/electron/ipc/notify.ts`

- [ ] **Step 1: Create electron/ipc/notify.ts**

```typescript
// electron/ipc/notify.ts
import { ipcMain, Notification } from 'electron'

export function registerNotifyHandlers(): void {
  ipcMain.handle('notify:send', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/notify.ts
git commit -m "feat: add OS notification IPC handler"
```

---

## Task 7: Create electron/preload.ts

**Files:**
- Create: `voltex-desktop/electron/preload.ts`

- [ ] **Step 1: Create electron/preload.ts**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  vault: {
    open: () => ipcRenderer.invoke('vault:open'),
    create: (name: string, parentPath: string) =>
      ipcRenderer.invoke('vault:create', name, parentPath),
    listRecent: () => ipcRenderer.invoke('vault:list-recent'),
    setRecent: (vaultPath: string) => ipcRenderer.invoke('vault:set-recent', vaultPath),
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', filePath, content),
    listFiles: (vaultPath: string) => ipcRenderer.invoke('fs:list-files', vaultPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete-file', filePath),
    renameFile: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('fs:rename-file', oldPath, newPath),
    onFileChanged: (callback: (filePath: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
      ipcRenderer.on('fs:file-changed', handler)
      // Return cleanup function
      return () => ipcRenderer.removeListener('fs:file-changed', handler)
    },
  },
  notify: {
    send: (title: string, body: string) => ipcRenderer.invoke('notify:send', title, body),
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat: add context bridge preload script"
```

---

## Task 8: Create electron/main.ts

**Files:**
- Create: `voltex-desktop/electron/main.ts`

- [ ] **Step 1: Create electron/main.ts**

```typescript
// electron/main.ts
import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import getPort from 'get-port'
import waitOn from 'wait-on'
import { registerVaultHandlers } from './ipc/vault'
import { registerFsHandlers } from './ipc/fs'
import { registerNotifyHandlers } from './ipc/notify'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let nextServerProcess: ChildProcess | null = null
let appPort = 3001

// ─── Next.js Server ───────────────────────────────────────────────────────────

async function startNextServer(): Promise<number> {
  if (isDev) {
    return parseInt(process.env.ELECTRON_PORT || '3001', 10)
  }

  const port = await getPort({ port: getPort.makeRange(3001, 3999) })
  const serverScript = path.join(process.resourcesPath, 'next-server', 'server.js')

  nextServerProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: path.join(process.resourcesPath, 'next-server'),
    stdio: 'pipe',
  })

  nextServerProcess.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) app.quit()
  })

  await waitOn({
    resources: [`http://127.0.0.1:${port}`],
    timeout: 30000,
  })

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

  mainWindow.loadURL(`http://127.0.0.1:${port}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
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
  // Use a blank 16x16 image as placeholder — replace public/icon.png in production
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png')
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
        app.isQuitting = true
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

  autoUpdater.checkForUpdatesAndNotify()

  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 4 * 60 * 60 * 1000)

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:update-ready')
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

// Extend app type for isQuitting flag
declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}
app.isQuitting = false

app.on('ready', async () => {
  registerVaultHandlers()
  registerFsHandlers()
  registerNotifyHandlers()

  appPort = await startNextServer()
  createWindow(appPort)
  createTray()
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
})

app.on('activate', () => {
  mainWindow?.show()
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (nextServerProcess) nextServerProcess.kill()
})
```

- [ ] **Step 2: Verify compilation**

```bash
node scripts/electron-build.mjs
```

Expected: `dist-electron/main.js` and `dist-electron/preload.js` created, output: `Electron build complete.`

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts dist-electron/
git commit -m "feat: add electron main process (window, tray, auto-updater, server)"
```

---

## Task 9: Create renderer-side vault client

**Files:**
- Create: `voltex-desktop/lib/vault/client.ts`
- Create: `voltex-desktop/lib/vault/serializer.ts`

- [ ] **Step 1: Create lib/vault/client.ts**

```typescript
// lib/vault/client.ts

/** True when running inside Electron (preload has injected electronAPI) */
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && 'electronAPI' in window

export const vaultClient = {
  open: (): Promise<string | null> =>
    window.electronAPI.vault.open(),

  create: (name: string, parentPath: string): Promise<string> =>
    window.electronAPI.vault.create(name, parentPath),

  listRecent: () =>
    window.electronAPI.vault.listRecent(),

  setRecent: (vaultPath: string) =>
    window.electronAPI.vault.setRecent(vaultPath),
}

export const fsClient = {
  readFile: (filePath: string) =>
    window.electronAPI.fs.readFile(filePath),

  writeFile: (filePath: string, content: string) =>
    window.electronAPI.fs.writeFile(filePath, content),

  listFiles: (vaultPath: string) =>
    window.electronAPI.fs.listFiles(vaultPath),

  deleteFile: (filePath: string) =>
    window.electronAPI.fs.deleteFile(filePath),

  renameFile: (oldPath: string, newPath: string) =>
    window.electronAPI.fs.renameFile(oldPath, newPath),

  onFileChanged: (callback: (filePath: string) => void): (() => void) =>
    window.electronAPI.fs.onFileChanged(callback),
}

export const notifyClient = {
  send: (title: string, body: string) =>
    window.electronAPI.notify.send(title, body),
}
```

- [ ] **Step 2: Create lib/vault/serializer.ts**

Check the exact Note type fields in `components/obsidian/data.ts` before this step. The Note interface has: `id, title, content, tags, folder, createdAt, updatedAt, starred, pinned, trashed, trashedAt, wordCount, type, drawingData, versionHistory`.

```typescript
// lib/vault/serializer.ts
import matter from 'gray-matter'
import path from 'path'
import type { Note } from '@/components/obsidian/data'

/** Serialize a Note to markdown string with YAML frontmatter */
export function noteToMarkdown(note: Note): string {
  const frontmatter: Record<string, unknown> = {
    id: note.id,
    title: note.title,
    tags: note.tags,
    folder: note.folder,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    starred: note.starred,
  }
  if (note.pinned !== undefined) frontmatter.pinned = note.pinned
  if (note.trashed) frontmatter.trashed = note.trashed
  if (note.trashedAt) frontmatter.trashedAt = note.trashedAt
  if (note.wordCount !== undefined) frontmatter.wordCount = note.wordCount
  if (note.type && note.type !== 'markdown') frontmatter.type = note.type
  if (note.drawingData) frontmatter.drawingData = note.drawingData
  // versionHistory is intentionally excluded — local-only, same as Firebase

  return matter.stringify(note.content || '', frontmatter)
}

/** Parse a .md file's raw content + absolute path into a Note */
export function markdownToNote(filePath: string, raw: string): Note {
  const { data, content } = matter(raw)
  const filename = path.basename(filePath, '.md')

  return {
    id: (data.id as string) || `note-${Date.now()}`,
    title: (data.title as string) || filename,
    content: content.trim(),
    tags: (data.tags as string[]) || [],
    folder: (data.folder as string) || 'root',
    createdAt: (data.createdAt as string) || new Date().toISOString(),
    updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    starred: (data.starred as boolean) || false,
    pinned: data.pinned as boolean | undefined,
    trashed: data.trashed as boolean | undefined,
    trashedAt: data.trashedAt as string | undefined,
    wordCount: data.wordCount as number | undefined,
    type: (data.type as Note['type']) || 'markdown',
    drawingData: data.drawingData as string | undefined,
    filePath,
  }
}

/** Derive the .md file path from a vault path and a note title */
export function noteFilePath(vaultPath: string, note: Pick<Note, 'title' | 'folder'>): string {
  const folder = note.folder && note.folder !== 'root' ? note.folder : ''
  const filename = `${note.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`
  return folder
    ? `${vaultPath}/${folder}/${filename}`
    : `${vaultPath}/${filename}`
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/vault/
git commit -m "feat: add vault IPC client and note serializer"
```

---

## Task 10: Update Note type to include filePath

**Files:**
- Modify: `voltex-desktop/components/obsidian/data.ts` (add `filePath`)
- Modify: `voltex-desktop/lib/firebase/sync.ts` (exclude `filePath` from Firestore)

- [ ] **Step 1: Add filePath to Note interface in data.ts**

Open `components/obsidian/data.ts`. Find the `Note` interface (line ~10). Add `filePath` after `drawingData`:

```typescript
  /** Newest-first content history snapshots for restore */
  versionHistory?: NoteVersion[];
  /** Absolute path to the .md file on disk (Electron only) */
  filePath?: string;
```

- [ ] **Step 2: Exclude filePath from noteToFirestore in sync.ts**

Open `lib/firebase/sync.ts`. The `noteToFirestore` function (line ~57) already excludes `versionHistory`. Confirm `filePath` is not included — it's not in the spread, so it's already safe. No change needed.

Verify `firestoreToNote` (line ~78) also does not set `filePath` — correct, it returns a fixed set of fields. No change needed.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/obsidian/data.ts
git commit -m "feat: add filePath field to Note type for local vault storage"
```

---

## Task 11: Integrate vault loading and save-to-disk in ObsidianApp

**Files:**
- Modify: `voltex-desktop/components/obsidian/ObsidianApp.tsx`

- [ ] **Step 1: Add vault state variables**

Open `components/obsidian/ObsidianApp.tsx`. After the existing state declarations (around line 99 where welcome state is), add:

```typescript
  // ── Vault (Electron desktop only) ──────────────────────────────────────────
  const [vaultPath, setVaultPath] = useState<string | null>(null);
```

- [ ] **Step 2: Add vault imports at the top of ObsidianApp.tsx**

At the top of the file, after existing imports, add:

```typescript
import { isElectron, vaultClient, fsClient, notifyClient } from "@/lib/vault/client";
import { noteToMarkdown, markdownToNote, noteFilePath } from "@/lib/vault/serializer";
```

- [ ] **Step 3: Add loadVault function inside ObsidianApp**

Inside the `ObsidianApp` component body (after state declarations), add:

```typescript
  const loadVault = useCallback(async (vaultDir: string) => {
    const filePaths = await fsClient.listFiles(vaultDir);
    const notes: Note[] = await Promise.all(
      filePaths.map(async (fp) => {
        const raw = await fsClient.readFile(fp);
        return markdownToNote(fp, raw);
      })
    );
    await vaultClient.setRecent(vaultDir);
    setVaultPath(vaultDir);
    patch({ notes });
    // Start watching for external changes
    fsClient.onFileChanged(async (changedPath) => {
      const raw = await fsClient.readFile(changedPath);
      const updated = markdownToNote(changedPath, raw);
      patch((prev) => ({
        notes: prev.notes.map((n) => (n.filePath === changedPath ? updated : n)),
      }));
    });
  }, [patch]);
```

- [ ] **Step 4: Add auto-open vault effect**

Find the existing first-run `useEffect` (around line 110 that checks `voltex-welcome-dismissed`). Inside it, before the welcome/workspace logic, add Electron vault detection:

```typescript
      // ── Electron: auto-open last vault ──────────────────────────────────
      if (isElectron()) {
        const recents = await vaultClient.listRecent();
        if (recents.length > 0) {
          await loadVault(recents[0].path);
          return; // skip welcome/workspace setup
        }
        // No recent vault — show vault welcome (handled by WelcomeModal below)
        setWelcomeModalOpen(true);
        return;
      }
```

- [ ] **Step 5: Add debounced save-to-disk on note update**

Find the `updateNote` handler (search for `updateNote` or where `notes` are patched with new content) in `ObsidianApp.tsx`. After the state patch, add:

```typescript
      // Save to disk in Electron
      if (isElectron() && vaultPath) {
        const updated = { ...existingNote, ...changes };
        const fp = updated.filePath || noteFilePath(vaultPath, updated);
        // Debounce write — use setTimeout pattern
        clearTimeout((window as any)._voltexSaveTimer);
        (window as any)._voltexSaveTimer = setTimeout(async () => {
          await fsClient.writeFile(fp, noteToMarkdown({ ...updated, filePath: fp }));
          if (!updated.filePath) {
            patch((prev) => ({
              notes: prev.notes.map((n) =>
                n.id === updated.id ? { ...n, filePath: fp } : n
              ),
            }));
          }
        }, 300);
      }
```

Note: Search for where `updateNote` patches state to find the exact insertion point. The `changes` and `existingNote` variable names may differ — adapt to match the existing code pattern.

- [ ] **Step 6: Add save on note create**

Find the `createNote` handler. After the note is added to state, add:

```typescript
      if (isElectron() && vaultPath) {
        const fp = noteFilePath(vaultPath, newNote);
        await fsClient.writeFile(fp, noteToMarkdown({ ...newNote, filePath: fp }));
        patch((prev) => ({
          notes: prev.notes.map((n) => (n.id === newNote.id ? { ...n, filePath: fp } : n)),
        }));
      }
```

- [ ] **Step 7: Add delete-to-trash on note delete**

Find the `deleteNote` (soft delete) and `permanentlyDeleteNote` handlers. In `deleteNote`, after soft-deleting in state, add:

```typescript
      if (isElectron() && note.filePath) {
        await fsClient.deleteFile(note.filePath);
      }
```

- [ ] **Step 8: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 9: Commit**

```bash
git add components/obsidian/ObsidianApp.tsx
git commit -m "feat: integrate vault loading and save-to-disk in ObsidianApp"
```

---

## Task 12: Update WelcomeModal for vault management

**Files:**
- Modify: `voltex-desktop/components/obsidian/ObsidianApp.tsx` (WelcomeModal + related props)

- [ ] **Step 1: Update WelcomeModal props interface**

Find `function WelcomeModal` (line ~1280). Change its props:

```typescript
// Before:
function WelcomeModal({ onDismiss, onSignIn }: { onDismiss: () => void; onSignIn: () => void }) {

// After:
interface WelcomeModalProps {
  onDismiss: () => void;
  onSignIn: () => void;
  onOpenVault?: () => void;
  onCreateVault?: () => void;
  recentVaults?: Array<{ path: string; name: string; lastOpened: number }>;
  onOpenRecent?: (vaultPath: string) => void;
}
function WelcomeModal({ onDismiss, onSignIn, onOpenVault, onCreateVault, recentVaults, onOpenRecent }: WelcomeModalProps) {
```

- [ ] **Step 2: Add vault section to WelcomeModal JSX**

Inside the WelcomeModal's right panel (the `<div>` with `md:w-72` around line 1362), after the existing "Get Started" button and before the closing `</div>`, add:

```tsx
              {/* Electron vault section */}
              {(onOpenVault || onCreateVault) && (
                <>
                  <div className="w-full h-px my-4" style={{ background: "var(--color-obsidian-border)" }} />
                  <div className="w-full text-left">
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      LOCAL VAULT
                    </p>
                    {onOpenVault && (
                      <button
                        onClick={onOpenVault}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium mb-2 text-left transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                      >
                        Open Folder...
                      </button>
                    )}
                    {onCreateVault && (
                      <button
                        onClick={onCreateVault}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium mb-2 text-left transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                      >
                        Create New Vault...
                      </button>
                    )}
                    {recentVaults && recentVaults.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs mb-1" style={{ color: "var(--color-obsidian-muted-text)" }}>Recent</p>
                        {recentVaults.map((v) => (
                          <button
                            key={v.path}
                            onClick={() => onOpenRecent?.(v.path)}
                            className="w-full px-3 py-1.5 rounded text-xs text-left truncate transition-opacity hover:opacity-80"
                            style={{ color: "var(--color-obsidian-text)" }}
                            title={v.path}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
```

- [ ] **Step 3: Wire up vault handlers in ObsidianApp**

Find where `<WelcomeModal` is rendered (line ~1185). Update it:

```tsx
      {welcomeModalOpen && (
        <WelcomeModal
          onDismiss={() => {
            try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
            setWelcomeModalOpen(false);
          }}
          onSignIn={() => {
            try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
            setWelcomeModalOpen(false);
            patch({ authModalOpen: true });
          }}
          onOpenVault={isElectron() ? async () => {
            const chosen = await vaultClient.open();
            if (chosen) {
              setWelcomeModalOpen(false);
              await loadVault(chosen);
            }
          } : undefined}
          onCreateVault={isElectron() ? async () => {
            const parentResult = await vaultClient.open();
            if (!parentResult) return;
            const name = prompt("Vault name:");
            if (!name) return;
            const newVault = await vaultClient.create(name, parentResult);
            setWelcomeModalOpen(false);
            await loadVault(newVault);
          } : undefined}
          recentVaults={isElectron() ? await vaultClient.listRecent() : undefined}
          onOpenRecent={isElectron() ? async (vaultDir) => {
            setWelcomeModalOpen(false);
            await loadVault(vaultDir);
          } : undefined}
        />
      )}
```

Note: `recentVaults` can't be `await`ed inline in JSX. Lift it into state instead. Add:

```typescript
  const [recentVaults, setRecentVaults] = useState<Array<{ path: string; name: string; lastOpened: number }>>([]);

  useEffect(() => {
    if (isElectron() && welcomeModalOpen) {
      vaultClient.listRecent().then(setRecentVaults);
    }
  }, [welcomeModalOpen]);
```

Then use `recentVaults` in the JSX above (replace the `await` call with `recentVaults`).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/obsidian/ObsidianApp.tsx
git commit -m "feat: add vault Open/Create/Recent to WelcomeModal"
```

---

## Task 13: Create electron-builder.yml

**Files:**
- Create: `voltex-desktop/electron-builder.yml`

- [ ] **Step 1: Create a 16x16 tray icon placeholder**

If `public/icon.png` doesn't exist, create one (any 256x256 PNG works as app icon). For tray, Electron will resize it automatically.

```bash
# Verify public/icon.png exists
ls public/icon.png
# If not, copy any PNG from public/ and rename it, or use a placeholder
```

- [ ] **Step 2: Create electron-builder.yml**

```yaml
appId: in.devlune.voltex-desktop
productName: Voltex Notes
copyright: Copyright © 2026 DevLune Studios

directories:
  output: release
  buildResources: build-resources

files:
  - dist-electron/**
  - public/**
  - "!node_modules/**"
  - "!.next/**"
  - "!src/**"

extraResources:
  - from: ".next/standalone"
    to: "next-server"
    filter:
      - "**/*"
  - from: ".next/static"
    to: "next-server/.next/static"
    filter:
      - "**/*"
  - from: "public"
    to: "next-server/public"
    filter:
      - "**/*"

win:
  target:
    - target: nsis
      arch: [x64]
  icon: public/icon.png

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

linux:
  target:
    - target: deb
      arch: [x64]
    - target: AppImage
      arch: [x64]
  icon: public/icon.png
  category: Office

publish:
  provider: github
  owner: Dev-Lune
  repo: voltex-desktop
  releaseType: release
```

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "feat: add electron-builder config for Windows + Linux"
```

---

## Task 14: Create GitHub Actions release workflow

**Files:**
- Create: `voltex-desktop/.github/workflows/release.yml`

- [ ] **Step 1: Create .github/workflows/release.yml**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

      - name: Compile Electron
        run: node scripts/electron-build.mjs

      - name: Build and Publish
        run: npm run electron:publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Add required GitHub Secrets**

In the `voltex-desktop` GitHub repo settings → Secrets → add all `NEXT_PUBLIC_FIREBASE_*` values from your `.env` file.

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions release workflow for Windows + Linux"
```

---

## Task 15: Test end-to-end in development

- [ ] **Step 1: Compile Electron files**

```bash
node scripts/electron-build.mjs
```

Expected: `dist-electron/main.js` and `dist-electron/preload.js` created.

- [ ] **Step 2: Run in dev mode**

```bash
npm run electron:dev
```

Expected: Next.js starts on port 3001, then Electron window opens loading `http://localhost:3001`. DevTools should open automatically.

- [ ] **Step 3: Verify Electron detection**

In DevTools console:
```js
window.electronAPI
```
Expected: object with `vault`, `fs`, `notify` keys.

- [ ] **Step 4: Test vault open**

In the app, the WelcomeModal should show "Open Folder" and "Create New Vault" buttons in Electron mode. Click "Open Folder", pick a directory. Verify notes load from any `.md` files in that folder.

- [ ] **Step 5: Test note create + save**

Create a new note, type content. Wait 300ms. Check the vault folder on disk — a `.md` file should appear with YAML frontmatter.

- [ ] **Step 6: Test system tray**

Close the window. Verify the app minimizes to tray instead of quitting. Right-click tray icon → verify menu shows Open Voltex / New Note / Quit.

- [ ] **Step 7: Test production build (optional, slow)**

```bash
npm run electron:build
```

Expected: `release/` folder with `.exe` (Windows) or `.deb` + `.AppImage` (Linux). Installer runs and app launches correctly.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "chore: verify end-to-end Electron dev build"
```

---

## Implementation Notes

- **Detect Electron vs web:** Always check `isElectron()` before calling any `vaultClient` or `fsClient` method. This keeps Firebase-only web mode working.
- **gray-matter works client-side:** `serializer.ts` can be imported directly in any component including `'use client'` ones. It's a pure JS library with no Node.js-only dependencies.
- **icon.png:** Replace `public/icon.png` with a proper 256x256 PNG before publishing. The tray icon uses 16x16, the installer uses the full size.
- **Firebase env vars:** Copy `.env.example` to `.env.local` in `voltex-desktop/` and fill in Firebase credentials. These are needed for cloud sync to work in the desktop app.
- **`versionHistory` exclusion:** The serializer intentionally omits `versionHistory` from `.md` files — it is local-only (same rule as Firebase sync).
- **Windows path separators:** `noteFilePath` uses `/` separators. On Windows, use `path.join` from Node.js (main process) or normalize paths when comparing. The `fsClient` calls go through IPC to the main process where Node.js handles this correctly.
