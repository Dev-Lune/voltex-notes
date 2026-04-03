# Voltex Notes — Bug & Issues Report

Generated from audit of `ObsidianApp.tsx`, `data.ts`, `lib/vault/client.ts`, `lib/vault/serializer.ts`, `Editor.tsx`, `TitleBar.tsx`, `RightPanel.tsx`, `SettingsModal.tsx`, `globals.css`.

---

## CRITICAL — Data Loss / Broken Functionality

### 1. `vaultSaveTimerRef` is a single timer for ALL notes (Electron data loss)
**File:** `ObsidianApp.tsx:608`  
**Bug:** `vaultSaveTimerRef.current` is one `setTimeout` ref shared across all notes. If you edit note A then edit note B within 300ms, A's save timer is cleared and **note A's changes are never written to disk**.  
**Fix:** Use a `Map<noteId, timer>` like `pushDebounceRef` already does for Firestore, keyed by `note.id`.

---

### 2. `renameNote` doesn't rename the file on disk (Electron)
**File:** `ObsidianApp.tsx:741`  
**Bug:** Renaming a note updates state + Firestore but never calls `fsClient.renameFile`. The old `.md` file stays on disk with the old name. On the next save (via `updateNote`), `noteFilePath` derives a path from the new title, creating a **second file** — the old file is orphaned forever.  
**Fix:** After updating state, call `fsClient.renameFile(oldFilePath, newFilePath)` when `isElectron() && renamedNote?.filePath`.

---

### 3. Side effect (`fsClient.deleteFile`) called inside `setState` callback
**File:** `ObsidianApp.tsx:684`  
**Bug:** `fsClient.deleteFile` is called from inside a `setState` updater function. React may call updater functions more than once (Strict Mode, concurrent features). This causes the IPC call to fire twice, potentially throwing errors or double-deleting.  
**Fix:** Move `fsClient.deleteFile` outside the `setState` call — compute the file path first, call setState, then call `fsClient.deleteFile` separately.

---

### 4. `loadVault` accumulates file-watcher listeners (memory leak + duplicate updates)
**File:** `ObsidianApp.tsx:155`  
**Bug:** Every call to `loadVault` registers a new `fsClient.onFileChanged` listener via `api().fs.onFileChanged(callback)`. The returned cleanup function is never called. On re-opening a vault or switching vaults, duplicate listeners fire, applying the same file-change update multiple times.  
**Fix:** Store the cleanup function in a ref (e.g. `fileWatcherCleanupRef`) and call it before registering a new listener.

---

### 5. `importNotes` doesn't write files to disk (Electron)
**File:** `ObsidianApp.tsx:532`  
**Bug:** Imported notes are added to state and pushed to Firestore, but `fsClient.writeFile` is never called. In Electron mode, imported notes vanish from the vault folder after closing the app.  
**Fix:** After `setState`, iterate `newNotes` and write each to disk with `noteToMarkdown` + `fsClient.writeFile` when `isElectron() && vaultPath`.

---

### 6. `moveNoteToFolder` doesn't move file on disk (Electron)
**File:** `ObsidianApp.tsx:554`  
**Bug:** Moving a note between folders updates state + Firestore but leaves the `.md` file in its original directory. The next debounced save writes to the new computed path, creating a **second file** while the original remains.  
**Fix:** Call `fsClient.renameFile(oldPath, newPath)` when `isElectron() && movedNote?.filePath`.

---

### 7. `createFolder` doesn't create directory on disk (Electron)
**File:** `ObsidianApp.tsx:523`  
**Bug:** Creating a folder only adds it to state. No actual directory is created via IPC. Notes saved to that folder will fail with a "directory not found" error if the subfolder doesn't exist on disk.  
**Fix:** Call `fsClient` (or a new `mkdirFile` IPC handler) to `mkdir` the folder path when `isElectron() && vaultPath`.

---

## HIGH — Non-Functional Features

### 8. `navigateBack` / `navigateForward` don't add note to `openNoteIds`
**File:** `ObsidianApp.tsx:431, 443`  
**Bug:** History navigation changes `activeNoteId` but doesn't ensure the note is in `openNoteIds`. If the user closed a tab, navigating back to it sets it as active but it won't appear in the tab bar — the editor shows nothing or the wrong note.  
**Fix:** In both `navigateBack` and `navigateForward`, also add the target `id` to `openNoteIds` if not already present (same logic as `openNote`).

---

### 9. `handleMarketplaceInstall` has stale `isMobile` closure
**File:** `ObsidianApp.tsx:802`  
**Bug:** `useCallback(..., [])` — empty dependency array — but the callback uses `isMobile`. On mobile, installing a panel plugin (heatmap, flashcards, mind-map) won't open the right panel drawer because `isMobile` is always the value from the first render.  
**Fix:** Add `isMobile` to the dependency array: `}, [isMobile]);`.

---

### 10. `appReady` never set to `true` if Electron vault fails to load
**File:** `ObsidianApp.tsx:168`  
**Bug:** In the Electron branch, `setAppReady(true)` is only called inside `loadVault`. If `loadVault` throws (IPC error, permission denied, etc.), `appReady` remains `false` and the app renders nothing — permanently blank screen with no fallback.  
**Fix:** Wrap the `await loadVault(recents[0].path)` call in a try/catch that falls back to `setWelcomeModalOpen(true)`.

---

### 11. `Ctrl+D` deletes active note without any confirmation
**File:** `ObsidianApp.tsx:963`  
**Bug:** The keyboard shortcut `Ctrl+D` immediately soft-deletes the active note with no confirmation dialog. Easy to trigger accidentally.  
**Fix:** Show a confirmation before deleting, or remove `Ctrl+D` entirely and rely on the sidebar context menu.

---

## MEDIUM — UI / UX Issues

### 12. Mobile drawer title says "Obsidian Cloud" (wrong brand name)
**File:** `ObsidianApp.tsx:1145`  
**Bug:** `<MobileDrawer ... title="Obsidian Cloud">` — should be "Voltex Notes".  
**Fix:** Change to `title="Voltex Notes"`.

---

### 13. Theme `useEffect` only sets `--obs-*` vars; `applyTheme()` sets both `--obs-*` and `--color-obsidian-*`
**File:** `ObsidianApp.tsx:237` vs `data.ts:974`  
**Bug:** `ObsidianApp.tsx`'s theme effect calls `root.style.setProperty(key, value)` for `--obs-*` keys only. `SettingsModal.tsx` calls the full `applyTheme()` which additionally sets `--color-obsidian-*` vars directly. This means theme changes triggered from Settings (via `handleThemeChange → patch → useEffect`) only set `--obs-*`. Tailwind's `@theme inline` tokens bake `--color-obsidian-*` as static references; if these aren't updated directly, Tailwind utility classes can render stale colors until a hard reload.  
**Fix:** Replace the theme `useEffect` body with a call to `applyTheme(theme)` from `data.ts`.

---

### 14. `prompt()` used for vault name creation (bad Electron UX)
**File:** `ObsidianApp.tsx:1323`  
**Bug:** `const name = prompt("Vault name:")` — native browser prompt inside Electron. It works but is unstyled, jarring, and can be blocked by some Electron security policies.  
**Fix:** Add a small inline text input to the WelcomeModal vault creation flow instead of using `prompt()`.

---

### 15. TitleBar back/forward buttons are always enabled (no disabled state)
**File:** `TitleBar.tsx:86`  
**Bug:** Back and forward buttons are always clickable even when there's nothing to navigate to. Clicking back at the start of history or forward at the end is a no-op, but buttons give no visual feedback.  
**Fix:** Pass `canGoBack` / `canGoForward` booleans as props and apply `opacity-40 cursor-not-allowed pointer-events-none` when disabled.

---

### 16. `createNote` folder uses `prev.preferences.defaultNoteLocation` inconsistently
**File:** `ObsidianApp.tsx:490`  
**Bug:** Inside the `setState` callback, `newNote.folder` is mutated after construction: `newNote.folder = folder`. The note was already built on line 476 with `folder: defaultFolder`. This mutation works but means `newNote` (used for Firestore push and Electron file save on lines 500–512) may have the wrong folder for a brief window.  
**Fix:** Compute the final folder once before constructing `newNote`, not inside `setState`.

---

## LOW — Code Quality / Minor

### 17. `loadVault` dependency array misses `fsClient` (stable but undeclared)
**File:** `ObsidianApp.tsx:118`  
The `loadVault` `useCallback` only lists `[patch]` but calls `fsClient.*`. `fsClient` is module-level and stable, so no functional bug, but it's a lint warning waiting to happen.

### 18. `deleteNote` second `setState` call is unnecessary
**File:** `ObsidianApp.tsx:680`  
After soft-deleting, a second `setState(prev => { ...; fsClient.deleteFile(...); return prev; })` is used purely to read the trashed note's `filePath`. This is an anti-pattern. Store the trashed note in a local variable during the first setState (same pattern as `movedNote`, `restoredNote`, etc.) and use it directly.

### 19. `YAML` parser: `drawingData` (large JSON blob) is stored in frontmatter
**File:** `lib/vault/serializer.ts:20`  
`drawingData` (full Excalidraw JSON) is serialized into the YAML frontmatter. For large drawings this bloats the frontmatter to hundreds of KB and makes the file unreadable in any external editor. It should be stored in the note body (after `---`) or in a separate sidecar file.

---

## Summary Table

| # | Severity | Area | Description |
|---|----------|------|-------------|
| 1 | CRITICAL | Electron/Save | Single save timer causes data loss on rapid note switching |
| 2 | CRITICAL | Electron/Rename | Rename doesn't rename file on disk → duplicate files |
| 3 | CRITICAL | Electron/Delete | `fsClient.deleteFile` inside setState → double IPC in StrictMode |
| 4 | CRITICAL | Electron/Watch | `onFileChanged` listeners accumulate → memory leak + duplicate updates |
| 5 | CRITICAL | Electron/Import | Imported notes not written to vault disk |
| 6 | CRITICAL | Electron/Folders | Move-to-folder doesn't move file on disk → duplicate files |
| 7 | CRITICAL | Electron/Folders | Create folder doesn't mkdir on disk → file writes fail |
| 8 | HIGH | Navigation | Back/forward nav breaks when tab was closed |
| 9 | HIGH | Mobile/Plugins | Stale `isMobile` closure in plugin install handler |
| 10 | HIGH | Electron/Boot | Blank screen if initial vault load throws |
| 11 | HIGH | UX | `Ctrl+D` deletes note with no confirmation |
| 12 | MEDIUM | Branding | Wrong app name in mobile drawer |
| 13 | MEDIUM | Theming | Theme effect doesn't call `applyTheme()` — Tailwind tokens may be stale |
| 14 | MEDIUM | Electron/UX | `prompt()` used for vault name in Electron |
| 15 | MEDIUM | UI | TitleBar back/forward always appear enabled |
| 16 | MEDIUM | Logic | `createNote` mutates note object inside setState |
| 17 | LOW | Code | `fsClient` missing from `loadVault` deps |
| 18 | LOW | Code | Second `setState` used as side-effect runner in `deleteNote` |
| 19 | LOW | Data | `drawingData` stored in YAML frontmatter (bloats .md files) |
