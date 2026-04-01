# Voltex Desktop — Electron App Design Spec

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

Convert Voltex Notes into a native desktop application using Electron, modeled after Obsidian's local-first vault approach. The existing web app (`ObsidianClone/`) is left completely untouched. A new sibling project `voltex-desktop/` is created by copying the web app files and adding an `electron/` native layer on top.

**Targets:** Windows (NSIS `.exe`) + Linux (`.deb` + `.AppImage`)
**Distribution:** GitHub Releases with auto-updates via `electron-updater`

---

## Architecture

### Approach: Next.js served inside Electron

The Electron main process starts a local Next.js server on a dynamic available port (not hardcoded — avoids conflicts if the web app is also running). The renderer window loads `http://localhost:<port>`. The renderer never touches the filesystem directly — all native operations go through a **context bridge IPC API** (`window.electronAPI`).

### Project Structure

```
Desktop/
├── ObsidianClone/              # Existing web app — UNTOUCHED
└── voltex-desktop/             # New Electron desktop app
    ├── app/                    # Copied from ObsidianClone
    ├── components/             # Copied from ObsidianClone
    ├── lib/
    │   ├── firebase/           # Copied from ObsidianClone
    │   └── vault/              # NEW — IPC client (renderer-side)
    │       ├── index.ts        # Vault open/create/recent via IPC
    │       └── fs.ts           # File read/write/watch via IPC
    ├── public/                 # Copied from ObsidianClone
    ├── electron/               # NEW — entire native layer
    │   ├── main.ts             # App lifecycle, window, tray, server start
    │   ├── preload.ts          # Context bridge — exposes IPC to renderer
    │   └── ipc/
    │       ├── vault.ts        # Vault open/create/recent (electron-store)
    │       ├── fs.ts           # File read/write/delete/watch (chokidar)
    │       └── notify.ts       # OS notification helpers
    ├── package.json            # Next.js + Electron + build deps
    ├── next.config.mjs         # Copied + adjusted (no middleware for desktop)
    ├── tsconfig.json           # Copied + extended for electron/
    └── electron-builder.yml    # Packaging + GitHub publish config
```

---

## Vault & Storage Layer

### Vault concept
A vault is a folder on disk. All notes are real `.md` files inside it. Subfolders map to folder groups in the sidebar — matching Obsidian's behavior.

### Vault lifecycle
1. On first launch → show Welcome screen with "Open Folder", "Create New Vault", "Recent Vaults"
2. On subsequent launches with a known recent vault → auto-open last vault
3. Recent vaults list persisted via `electron-store`

### Note model changes
- `Note` gains a `filePath: string` field (absolute path to the `.md` file on disk)
- Note ID remains `note-${Date.now()}` internally; filename is derived from note title
- On note title rename → rename the `.md` file on disk

### Read/Write flow
- **Vault open:** Read all `.md` files recursively → parse frontmatter → populate `AppState.notes`
- **Note edit:** Debounced write to disk (300ms after last keystroke)
- **Note create:** Write `.md` file immediately
- **Note delete (soft):** Move file to `<vault>/.trash/` subfolder (recoverable)
- **Note delete (permanent):** Delete from `.trash/`

### File watching
- `chokidar` watches vault folder in main process
- External edits (VS Code, etc.) trigger IPC event → renderer reloads affected note

### Firebase
- Remains exactly as-is — if signed in, syncs to Firestore
- Local file is source of truth; Firestore is a mirror
- Works in parallel with local file storage — no conflict between the two

---

## IPC API Surface

Exposed on `window.electronAPI` via preload context bridge:

```ts
// Vault management
vault.open()                    // Show native folder picker
vault.create(name, parentPath)  // Create new vault folder
vault.listRecent()              // Get recent vaults from electron-store
vault.setRecent(vaultPath)      // Save vault to recent list

// File system
fs.readFile(path)               // Read file contents
fs.writeFile(path, content)     // Write file contents
fs.listFiles(vaultPath)         // List all .md files recursively
fs.deleteFile(path)             // Move to .trash/
fs.renameFile(oldPath, newPath) // Rename/move file
fs.watch(vaultPath, callback)   // Watch for external changes

// Notifications
notify.send(title, body)        // OS notification
notify.updateAvailable()        // "Update ready" notification
```

---

## Native Features

### System Tray
- App minimizes to tray instead of quitting on window close
- Tray right-click menu: **Open Voltex** | **New Note** | ─── | **Quit**
- Double-click tray icon → show/focus window

### OS Notifications
- Toggleable in Settings: note saved confirmation
- Sync status changes (Firebase connect/disconnect)
- Auto-update available prompt

### Auto-Updates
- `electron-updater` checks on launch and every 4 hours
- Downloads update silently in background
- Notifies user when ready: "Restart and update" prompt
- User controls when restart happens

### Distribution
| Platform | Format | Notes |
|----------|--------|-------|
| Windows | NSIS `.exe` | Standard installer with shortcuts |
| Linux | `.deb` | Debian/Ubuntu |
| Linux | `.AppImage` | Universal, no install needed |

GitHub Actions workflow triggers on `v*` tag push → builds all targets → publishes to GitHub Releases.

---

## Welcome Screen Changes

The existing Welcome screen is extended (not replaced):
- Add **"Open Folder"** button → triggers `vault.open()` IPC
- Add **"Create New Vault"** button → triggers `vault.create()` IPC
- Add **"Recent Vaults"** list → populated from `vault.listRecent()` IPC
- On subsequent launches with a known vault → auto-open, skip Welcome screen

---

## Key Dependencies Added

| Package | Purpose |
|---------|---------|
| `electron` | Desktop shell |
| `electron-builder` | Packaging for Windows + Linux |
| `electron-updater` | Auto-update via GitHub Releases |
| `electron-store` | Persist recent vaults + settings |
| `chokidar` | File system watcher |
| `wait-on` | Wait for Next.js server before opening window |
| `concurrently` | Run Next.js + Electron together in dev |

---

## Dev Workflow

```bash
# Install
npm install

# Development (runs Next.js + Electron together)
npm run electron:dev

# Build desktop app
npm run electron:build

# Build + publish to GitHub Releases (CI only)
npm run electron:publish
```

---

## What Is NOT Changed

- All existing React components in `components/obsidian/`
- Firebase sync logic in `lib/firebase/`
- The web app at `ObsidianClone/` — completely untouched
- AppState structure (only `filePath` field added to `Note`)
