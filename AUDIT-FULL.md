# Voltex Notes — Full Codebase Audit (Verified)

> Deep audit of every component, Electron layer, Firebase sync, and styling.
> **Verification date:** April 7, 2026 — each issue checked against current code.

---

## CRITICAL — Data Loss / Security / Crashes

| # | Issue | Status |
|---|-------|--------|
| C1 | Path Traversal in ALL Electron IPC file handlers | ✅ FIXED |
| C2 | Single save timer shared across ALL notes | ✅ FIXED |
| C3 | Rename note doesn't rename file on disk | ✅ FIXED |
| C4 | Side-effect (fsClient.deleteFile) inside setState | ✅ FIXED |
| C5 | onFileChanged listeners accumulate (memory leak) | ✅ FIXED |
| C6 | Imported notes not written to disk (Electron) | ✅ FIXED |
| C7 | Move-to-folder doesn't move file on disk | ✅ FIXED |
| C8 | Create folder doesn't mkdir on disk | ✅ FIXED |
| C9 | deleteFolder/renameFolder side-effects inside setState | ✅ FIXED |
| C10 | First-run useEffect has no dependency array | ✅ FIXED |
| C11 | Race condition in sync initialization | ✅ FIXED |
| C12 | Crash if installedPluginIds is undefined | ✅ FIXED |

### C1 — Path Traversal ✅
All IPC handlers now call `assertInsideVault()` — validates via `path.resolve()` + `startsWith(vaultRoot + path.sep)`.

### C2 — Save Timer ✅
`vaultSaveTimerRef` is now `useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())` — per-note debounce.

### C3 — Rename on Disk ✅
`renameNote` calls `fsClient.renameFile(note.filePath, newPath)` after state update.

### C4 — Side-effect in setState ✅
`fsClient.deleteFile` called **outside** `setState`, after capturing `trashedNote` in a local variable.

### C5 — Listener Leak ✅
`fileWatcherCleanupRef` stores cleanup; called before registering new listener in `loadVault`.

### C6 — Import to Disk ✅
`importNotes` calls `fsClient.writeFile()` for each note when in Electron mode.

### C7 — Move on Disk ✅
`moveNoteToFolder` calls `fsClient.renameFile(note.filePath, newPath)` after state update.

### C8 — mkdir on Disk ✅
`createFolder` calls `fsClient.mkdir()` when in Electron mode.

### C9 — Folder Side-effects ✅
`fsClient.rmdir` and `fsClient.renameDir` calls are **outside** `setState` callbacks.

### C10 — useEffect Deps ✅
Initialization useEffect has `[]` dependency array — runs once on mount.

### C11 — Sync Race ✅ FIXED
`onRemoteChange` callback now gates behind `appReady` — returns early if state hasn't initialized. The auth/sync useEffect depends on `[patch, appReady]`.

### C12 — Plugin IDs ✅
`installedPluginIds` typed as `string[]` and always passed as a proper array.

---

## HIGH — Broken Features / Wrong Behavior

| # | Issue | Status |
|---|-------|--------|
| H1 | exportNoteAsHTML() undefined — crashes | ✅ FIXED |
| H2 | Empty trash silently fails | ✅ FIXED |
| H3 | Permanent delete has no confirmation | ✅ FIXED |
| H4 | Back/forward nav doesn't add to openNoteIds | ✅ FIXED |
| H5 | Stale isMobile closure in marketplace install | ✅ FIXED |
| H6 | Blank screen if vault load throws | ✅ FIXED |
| H7 | Ctrl+D deletes without confirmation | ✅ FIXED |
| H8 | Keyboard shortcuts massive dep array | ✅ FIXED |
| H9 | Stale closures in Electron IPC listeners | ✅ FIXED |
| H10 | switchWebVault recreated constantly | ✅ FIXED |
| H11 | Data loss when switching web vaults | ✅ FIXED |
| H12 | Google Sign-In port conflict | ✅ FIXED |
| H13 | Chokidar watcher never cleaned up | ✅ FIXED |

### H1 — exportNoteAsHTML ✅
Function exists at Editor.tsx line ~1841 and is invoked from export buttons.

### H2 — Empty Trash ✅
Shows `confirm()` dialog then calls `onPermanentlyDelete` for each trashed note.

### H3 — Permanent Delete ✅
Both single and bulk permanent delete show `confirm()` dialogs.

### H4 — Nav + openNoteIds ✅
Both `navigateBack` and `navigateForward` add target note to `openNoteIds` if not present.

### H5 — isMobile Closure ✅
`useCallback` dependency array includes `isMobile`.

### H6 — Vault Load Crash ✅
Wrapped in try/catch: `catch { setAppReady(true); setWelcomeModalOpen(true); }`.

### H7 — Ctrl+D Confirm ✅
Shows `confirm("Move ... to trash?")` before deleting.

### H8 — Shortcuts Deps ✅
Reduced to `[patch, isMobile]` — handler uses `stateRef.current` and refs.

### H9 — IPC Closures ✅
All IPC listeners use refs (`createNoteRef`, `deleteNoteRef`, etc.).

### H10 — switchWebVault ✅
Uses `stateRef.current` inside callback; stable dependency array.

### H11 — Vault Switch Save ✅
`saveWebVaultData()` called for current vault **before** loading new one.

### H12 — Auth Mutex ✅
`authInProgress` flag prevents concurrent sign-in attempts.

### H13 — Watcher Cleanup ✅
`if (watcher) watcher.close()` before creating new watcher.

---

## MEDIUM — UX / Theming / Logic

| # | Issue | Status |
|---|-------|--------|
| M1 | "Obsidian Cloud" branding in mobile drawer | ✅ FIXED |
| M2 | "Hello, Obsidian!" in settings code preview | ✅ FIXED |
| M3 | Theme useEffect doesn't call applyTheme() | ✅ FIXED |
| M4 | prompt() for vault name creation | ✅ FIXED |
| M5 | TitleBar back/forward always enabled | ✅ FIXED |
| M6 | Italic text uses muted color | ✅ FIXED |
| M7 | Sliding panes does nothing | ✅ FIXED |
| M8 | createNote folder mutation inside setState | ✅ FIXED |
| M9 | Vault creation no validation | ✅ FIXED |
| M10 | Hover preview unclickable | ✅ FIXED |
| M11 | autoUpdater.quitAndInstall() no error handling | ✅ FIXED |
| M12 | Splash window leak on startup error | ✅ FIXED |

---

## LOW — Code Quality / Minor

| # | Issue | Status |
|---|-------|--------|
| L1 | fsClient missing from loadVault deps | ✅ NOT A BUG |
| L2 | Second setState as side-effect runner | ✅ FIXED |
| L3 | drawingData in YAML frontmatter | ✅ FIXED |
| L4 | Regex created every render | ✅ FIXED |
| L5 | navigator.platform deprecated | ✅ FIXED |
| L6 | Preload event listener leak | ✅ FIXED |
| L7 | FoldableHeading accessibility | ✅ FIXED |
| L8 | Unsafe JSON.parse for drawingData | ✅ FIXED |
| L9 | YAML parser edge cases | ✅ FIXED |
| L10 | Multiple OAuth flows simultaneously | ✅ FIXED |

### L1 — NOT A BUG
`fsClient` is a module-level import — doesn't need to be in React dependency array.

### L3 — FIXED ✅
`drawingData` now stored as a hidden HTML comment block (`<!-- excalidraw-data ... -->`) in the note body instead of YAML frontmatter. Backwards-compatible: `markdownToNote` reads from both locations.

### L9 — FIXED ✅
Manual YAML parser replaced with `gray-matter` (already a dependency). Handles all YAML edge cases correctly.

---

## Final Summary

| Severity | Total | ✅ Fixed | ⚠️ Remaining | Not a Bug |
|----------|-------|---------|--------------|-----------|
| CRITICAL | 12 | 12 | 0 | 0 |
| HIGH | 13 | 13 | 0 | 0 |
| MEDIUM | 12 | 12 | 0 | 0 |
| LOW | 10 | 9 | 0 | 1 |
| **TOTAL** | **47** | **46** | **0** | **1** |

### 0 Remaining Issues

All 47 audited issues are resolved.

### Previously Fixed (from earlier audits)

All 22 items from `audit.md` + all 19 items from `fixes.md` that were marked fixed remain fixed.
