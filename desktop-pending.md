# Voltex Notes — Desktop Software Pending Work

> **fixes.md** and **ui-ux-fixes.md** are audit documents only. Zero fixes have been implemented yet.  
> This file covers everything still needed to make this a proper native desktop application — not just a web page inside a window.

---

## PART 1 — ELECTRON LAYER BUGS (electron/ code is broken or incomplete)

### 1. File watcher NEVER starts — `fs:watch` IPC is dead code
**Files:** `electron/ipc/fs.ts:68`, `electron/preload.ts`, `ObsidianApp.tsx:155`  
**Bug:** `ipc/fs.ts` registers a `fs:watch` handler that starts chokidar, but `preload.ts` **never exposes `fs:watch`** to the renderer. `loadVault` calls `fsClient.onFileChanged(callback)` which only registers a listener for `fs:file-changed` events — but since `fs:watch` is never called, chokidar is never started and `fs:file-changed` events are never emitted. External file changes are silently ignored.  
**Fix:** Either expose `fsWatch(vaultPath)` in preload and call it in `loadVault`, or call `ipcMain` `fs:watch` automatically inside `vault:open`/`vault:list-recent`.

---

### 2. Chokidar watcher uses `getFocusedWindow()` — breaks when minimized to tray
**File:** `electron/ipc/fs.ts:76`  
**Bug:** `const win = BrowserWindow.getFocusedWindow()` returns `null` when the window is hidden to tray or not focused. If an external editor changes a file while Voltex is in the tray, `win` is null and `win.webContents.send(...)` crashes the main process.  
**Fix:** Store a reference to `mainWindow` at module scope and use that instead of `getFocusedWindow()`.

---

### 3. Tray "New Note" IPC event has no listener in renderer
**File:** `electron/main.ts:187`, renderer  
**Bug:** Tray context menu sends `mainWindow.webContents.send('tray:new-note')`, but nowhere in the React app does anything listen for this event via `ipcRenderer.on('tray:new-note', ...)`. Clicking "New Note" from tray does nothing.  
**Fix:** Expose `onTrayNewNote(callback)` in `preload.ts` and wire a listener in `ObsidianApp.tsx` to call `createNote()`.

---

### 4. No `fs:mkdir` IPC handler — `createFolder` silently does nothing on disk
**File:** `electron/ipc/fs.ts`, `ObsidianApp.tsx:523`  
**Bug:** `ipc/fs.ts` has no handler for creating directories. When the user creates a folder in the sidebar, it only updates React state. Notes saved to that folder will throw `ENOENT: no such file or directory` because the subdirectory doesn't exist. (`fs:write-file` does `mkdirSync` on write, so this partially works, but only when a note is actually saved.)  
**Fix:** Add `ipcMain.handle('fs:mkdir', (_e, dirPath) => mkdirSync(dirPath, { recursive: true }))`, expose it in preload, call it in `createFolder` when `isElectron() && vaultPath`.

---

### 5. No `window:set-title` IPC — window always shows "Voltex Notes"
**File:** `electron/main.ts`, renderer  
**Bug:** No IPC handler exists for setting the window title from renderer. The active note name never appears in the taskbar/Alt+Tab switcher.  
**Fix:** Add `ipcMain.handle('window:set-title', (_e, title) => mainWindow?.setTitle(title))`, expose in preload, and call it in `ObsidianApp.tsx` whenever `activeNoteId` changes.

---

### 6. No `app:get-version` / `app:get-platform` IPC — renderer is blind
**File:** `electron/main.ts`  
**Bug:** Renderer cannot get the app version (for the About/Settings panel) or detect OS (to show `Ctrl+P` vs `⌘P`). These are basic desktop app requirements.  
**Fix:** Add handlers:
```
ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('app:get-platform', () => process.platform)
```

---

### 7. No native "Save File" dialog IPC — Export still uses browser download
**File:** `electron/ipc/fs.ts`, `Editor.tsx:1453`  
**Bug:** "Export as Markdown" and "Export as HTML" create `<a download>` and click it — browser download behavior. No native Save dialog, no location choice, no success feedback.  
**Fix:** Add `ipcMain.handle('dialog:save-file', async (_e, defaultName, content) => { const r = await dialog.showSaveDialog({...}); if (!r.canceled) writeFileSync(r.filePath, content); return !r.canceled })`, expose in preload, use it in the export actions.

---

### 8. `readFileSync` / `writeFileSync` are synchronous — blocks IPC thread
**File:** `electron/ipc/fs.ts:26–34`  
**Bug:** All file I/O uses synchronous Node.js APIs on the main process IPC thread. For large vaults (100+ notes or large drawings), `loadVault` blocks the entire app until all files are read.  
**Fix:** Switch to `fs.promises.readFile`, `fs.promises.writeFile`, etc. (async versions). `ipcMain.handle` supports async handlers natively.

---

### 9. No error handling in `readFileSync` — crashes main process on missing file
**File:** `electron/ipc/fs.ts:27`  
**Bug:** `return readFileSync(filePath, 'utf-8')` throws an uncaught exception if the file was deleted or moved externally. This crashes the IPC handler and the renderer gets a rejected promise with no recovery path.  
**Fix:** Wrap in try/catch and return `null` (or throw a structured error).

---

### 10. Tray icon path breaks in production
**File:** `electron/main.ts:169`  
**Bug:** `path.join(__dirname, '..', 'public', 'icon-16x16.png')` works in dev (`dist-electron/../public/`) but in a packaged app the `public/` folder is at `process.resourcesPath/next-server/public/`, not next to `dist-electron/`. The tray icon will fail to load silently and show a blank tray icon.  
**Fix:** Use `path.join(isDev ? '' : path.join(process.resourcesPath, 'next-server'), 'public', 'icon-16x16.png')` with a dev/prod branch.

---

### 11. Auto-updater has no UI wiring — `updater` events are exposed but never consumed
**File:** `electron/preload.ts:31–47`, renderer  
**Bug:** The preload exposes `updater.onUpdateAvailable`, `onDownloadProgress`, `onUpdateReady`, and `installUpdate` — but no React component or hook in the app listens for these events. Users never see an update notification and can never trigger an install.  
**Fix:** Add an `UpdaterBanner` component in `ObsidianApp.tsx` that listens for `window.electronAPI.updater.onUpdateReady(...)` and shows a banner: `"v1.x.x is ready — Restart to install"` with a Restart button.

---

## PART 2 — NATIVE DESKTOP FEATURES MISSING ENTIRELY

### 12. No application menu bar (File / Edit / View / Help)
**File:** `electron/main.ts`  
**Bug:** `Menu.setApplicationMenu(null)` is never called, so Electron uses its default Chrome-style menu on Windows/Linux. There's no proper `File > New Note`, `Edit > Undo/Redo`, `View > Toggle Sidebar`, `Help > About` menu. On macOS the app literally has no menu and keyboard shortcuts like Cmd+Q don't work.  
**Fix:** Build a native menu with `Menu.buildFromTemplate([...])` and call `Menu.setApplicationMenu(menu)` in `app.on('ready')`. Include standard items: File (New Note, Open Vault, Switch Vault, Export, Quit), Edit (Undo, Redo, Cut, Copy, Paste, Select All), View (Toggle Sidebar, Toggle Right Panel, Zoom In/Out, Toggle DevTools), Help (About, Check for Updates, Report Issue).

---

### 13. No window state persistence — always opens at 1280×800
**File:** `electron/main.ts:92`  
**Bug:** Window always creates at `width: 1280, height: 800`. If the user resizes or moves the window, it reverts to default next launch.  
**Fix:** Use `electron-store` to save/restore window bounds on `mainWindow.on('resize')` and `mainWindow.on('move')`. On create, restore saved bounds and call `mainWindow.setBounds(savedBounds)`. Also save/restore maximized state.

---

### 14. No Windows Jump List / Recent Documents
**File:** `electron/ipc/vault.ts`  
**Bug:** When a vault is opened, it's saved to `electron-store` but never added to Windows' Jump List (right-click on taskbar) or macOS Dock's Recent items. Desktop note apps always have "Recent Files" in the OS.  
**Fix:** Call `app.addRecentDocument(vaultPath)` in `vault:set-recent` handler. On Windows, also configure Jump List categories with recent vaults.

---

### 15. No spell check — webPreferences doesn't enable it
**File:** `electron/main.ts:98`  
**Bug:** `webPreferences` doesn't include `spellcheck: true`. Right-clicking misspelled words doesn't offer corrections. Electron has built-in Hunspell spell checking that's opt-in.  
**Fix:** Add `spellcheck: true` to `webPreferences`. Also add a context-menu handler via `mainWindow.webContents.on('context-menu', ...)` to surface spelling suggestions in a native context menu.

---

### 16. No native right-click context menu for text editing
**File:** `electron/main.ts`  
**Bug:** Right-clicking in the editor textarea shows no context menu (Cut/Copy/Paste/Spell check suggestions). The default Electron behavior blocks it without `webPreferences.spellcheck` and a `context-menu` handler.  
**Fix:** Listen to `mainWindow.webContents.on('context-menu', (e, params) => {...})` and call `Menu.buildFromTemplate([cut, copy, paste, separator, ...spellingSuggestions]).popup()`.

---

### 17. Zoom level not persisted
**Bug:** Ctrl+/- (zoom in/out) works via Electron's built-in zoom, but resets to 100% on every relaunch.  
**Fix:** Listen to `mainWindow.webContents.on('zoom-changed', ...)`, save the zoom factor to `electron-store`, and restore via `mainWindow.webContents.setZoomFactor(saved)` on startup.

---

### 18. No splash/loading screen — blank white window during Next.js startup
**File:** `electron/main.ts:103`  
**Bug:** `show: false` hides the window until `ready-to-show`, but during the 2–5s wait for Next.js server to start there's nothing. Users see no feedback that the app is loading, and on slow machines it looks like the app didn't open.  
**Fix:** Show a minimal splash `BrowserWindow` (a simple HTML file with the app logo + spinner) immediately on `app.on('ready')`, then close it and show the main window when `ready-to-show` fires.

---

### 19. `localStorage` used for settings — wrong storage for a desktop app
**File:** `ObsidianApp.tsx:182, 244, 249`  
**Bug:** Theme, welcome-dismissed state, workspace-configured, and sort preferences all go to `localStorage`. In Electron, `localStorage` lives inside Chromium's user data directory — it persists but:
- Gets wiped if the user clears browser data
- Is not accessible from the main process
- Cannot be read before the renderer loads (causes FOUC on theme)
- Wrong path if the app's `userData` directory changes

**Fix:** Migrate all persistent settings (theme, preferences, dismissed states) to `electron-store` via IPC. Add `ipcMain.handle('store:get', (e, key))` and `ipcMain.handle('store:set', (e, key, value))` handlers.

---

### 20. `@vercel/analytics` in dependencies — sends telemetry from desktop users
**File:** `package.json`  
**Bug:** `@vercel/analytics` is a web analytics package that phones home to Vercel on every page view. Desktop users shouldn't be sending analytics to a web hosting company. It may also make unwanted network requests and slow cold start.  
**Fix:** Remove `@vercel/analytics` from `package.json` and remove any `<Analytics />` component usage in the app layout.

---

### 21. No "About" dialog
**Bug:** There's no way for users to see the app version, build date, licenses, or support info. This is a basic requirement for a shipped desktop application.  
**Fix:** Add an IPC handler for `app:get-version` (see item 6) and create an About screen in Settings → Account tab showing: App name, version, Electron version, Node.js version, links to GitHub/support, and open-source license summary.

---

### 22. No "Switch Vault" option after first run
**File:** `ObsidianApp.tsx`, `SettingsModal.tsx`  
**Bug:** Once the welcome modal is dismissed, there's no UI to open a different vault, access recent vaults, or create a new one. The only recovery is clearing `localStorage` or deleting Electron's user data.  
**Fix:** Add a "Vault" section in Settings → General with: current vault path (read-only), "Switch Vault…" button (calls `vaultClient.open()` + `loadVault()`), "Create New Vault…" button, and a "Recent Vaults" list.

---

### 23. No macOS support — `titleBarStyle` not configured, no dock behavior
**File:** `electron/main.ts:92`  
**Bug:** On macOS: the title bar doesn't use native `hiddenInset` style, traffic light buttons overlap content, `app.dock` APIs aren't used, and there's no `darwin`-specific menu. The app is effectively untested/broken on Mac.  
**Fix:** Add platform checks: `...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {})` in `BrowserWindow` options. Add macOS-specific menu items (Services, Hide, etc.). Handle `app.on('activate')` to re-show window (already done).

---

### 24. No deep link / protocol handler
**Bug:** `voltex://open?vault=/path/to/vault` style deep links don't work. This means the app can't be opened to a specific vault from external tools, scripts, or other apps.  
**Fix:** Register protocol with `app.setAsDefaultProtocolClient('voltex')` and handle `open-url` (macOS) / `second-instance` (Windows) events to parse and route the URL.

---

### 25. File associations — `.md` files don't open in Voltex
**File:** `electron-builder.yml`  
**Bug:** The installer doesn't register `.md` as a file type associated with Voltex. Double-clicking a `.md` file in Explorer opens Notepad or VS Code instead.  
**Fix:** Add `fileAssociations` to `electron-builder.yml`:
```yaml
fileAssociations:
  - ext: md
    name: Markdown Note
    description: Open with Voltex Notes
    icon: public/icon-256x256.png
```
Handle the opened file path in `app.on('open-file')` (macOS) and `process.argv` (Windows).

---

## PART 3 — ALL ITEMS FROM fixes.md (NOT IMPLEMENTED)

These are all still open — none have been touched:

| # | Description | File |
|---|-------------|------|
| 1 | Shared vault save timer causes data loss | `ObsidianApp.tsx:608` |
| 2 | Rename note doesn't rename file on disk | `ObsidianApp.tsx:741` |
| 3 | `fsClient.deleteFile` inside setState (double IPC in StrictMode) | `ObsidianApp.tsx:684` |
| 4 | `loadVault` accumulates file-watcher listeners | `ObsidianApp.tsx:155` |
| 5 | `importNotes` doesn't write to disk | `ObsidianApp.tsx:532` |
| 6 | `moveNoteToFolder` doesn't move file on disk | `ObsidianApp.tsx:554` |
| 7 | `createFolder` doesn't mkdir on disk | `ObsidianApp.tsx:523` |
| 8 | Back/forward nav doesn't re-add note to `openNoteIds` | `ObsidianApp.tsx:431` |
| 9 | `handleMarketplaceInstall` stale `isMobile` closure | `ObsidianApp.tsx:833` |
| 10 | Blank screen forever if initial vault load throws | `ObsidianApp.tsx:168` |
| 11 | Ctrl+D deletes with no confirmation | `ObsidianApp.tsx:963` |
| 12 | Mobile drawer says "Obsidian Cloud" | `ObsidianApp.tsx:1145` |
| 13 | Theme effect doesn't call `applyTheme()` | `ObsidianApp.tsx:237` |
| 14 | `prompt()` for vault name | `ObsidianApp.tsx:1323` |
| 15 | TitleBar back/forward always look enabled | `TitleBar.tsx:86` |
| 16 | `createNote` mutates note inside setState | `ObsidianApp.tsx:490` |

---

## PART 4 — ALL ITEMS FROM ui-ux-fixes.md (NOT IMPLEMENTED)

| # | Description | File |
|---|-------------|------|
| 1 | Find/Replace prev/next buttons have no icons | `Editor.tsx:190` |
| 2 | Exit selection mode button is empty | `Sidebar.tsx:819` |
| 3 | Breadcrumb shows raw folder ID | `TitleBar.tsx:112` |
| 4 | ⌘P shown on Windows | `TitleBar.tsx:141` |
| 5 | Kanban/Table tabs missing icons | `Editor.tsx:684` |
| 6 | Export uses browser download in Electron | `Editor.tsx:1453` |
| 7 | Explorer context menu ignores installed plugins | `Sidebar.tsx:867` |
| 8 | "Table" note type has no creation path | `data.ts` |
| 9 | No unsaved/pending-sync indicator on tabs | `Editor.tsx:668` |
| 10 | Pomodoro widget overlaps toast | `Editor.tsx:1657` |
| 11 | Bulk delete has no confirmation | `Sidebar.tsx:543` |
| 12 | Sort order not persisted | `Sidebar.tsx:455` |
| 13 | Tab bar no visible scrollbar, no scroll-to-active | `Editor.tsx:661` |
| 14 | Tab close button hidden until hover | `Editor.tsx:687` |
| 15 | Back/forward buttons always appear enabled | `TitleBar.tsx:86` |
| 16 | Sync badge shown when offline/not signed in | `Sidebar.tsx:831` |
| 17 | Window title always "Voltex Notes" | `electron/main.ts:97` |
| 18 | No Switch Vault option | `ObsidianApp.tsx` |
| 19 | `prompt()` for vault name | `ObsidianApp.tsx:1323` |
| 20 | Right panel 8 tabs overflow at narrow width | `RightPanel.tsx` |
| 21 | Mobile drawer wrong brand name | `ObsidianApp.tsx:1145` |
| 22 | Two conflicting New Note buttons in toolbar | `Editor.tsx:1538` |
| 23 | FrontmatterEditor corrupts array fields | `Editor.tsx:499` |
| 24 | Default browser drag ghost in Electron | `Sidebar.tsx:186` |
| 25 | "No results" shown before typing in Find | `Editor.tsx:160` |

---

## Priority Order (what to do first)

1. **Electron IPC fixes** — Items 1–11 above. The app breaks silently without these.
2. **Native menus** — Item 12. Required on macOS, expected on Windows.
3. **All fixes.md items 1–7** — Data loss bugs in Electron vault operations.
4. **UI broken items** — ui-ux-fixes items 1–5 (invisible buttons, wrong labels).
5. **Window state + settings persistence** — Items 13, 19.
6. **Auto-updater UI** — Item 11.
7. **Everything else** — In order of severity.
