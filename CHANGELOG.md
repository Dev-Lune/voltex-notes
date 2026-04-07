# Changelog

All notable changes to Voltex Notes are documented here.

---

## [1.2.0] — 2026-04-07

### Added
- **Excalidraw Integration** — Official `@excalidraw/excalidraw` component replaces the custom canvas. Full drawing tools, proper CSS isolation, SSR-safe dynamic loading.
- **Hand-Drawn Landing Page** — Complete homepage redesign with sketchy aesthetic: Kalam + Patrick Hand fonts, paper dot texture, wobbly borders, hard offset shadows, tape/tack decorations, squiggly SVG underlines, animated stat counters.
- **Folder Auto-Creation** — Creating a note from the empty state (Daily, Drawing) now auto-creates the target folder so it appears in the sidebar immediately.

### Fixed

#### Critical (12)
- **Path traversal** on all Electron IPC file handlers — `assertInsideVault()` validates every path.
- **Per-note save timers** — each note gets its own debounce timer instead of a single shared one.
- **Rename on disk** — renaming a note now renames the file on disk.
- **Move on disk** — moving a note to a folder now moves the file on disk.
- **Side-effects outside setState** — `deleteFile`, `rmdir`, `renameDir` calls moved out of React setState callbacks.
- **File watcher leak** — `onFileChanged` listeners cleaned up before registering new ones.
- **Import writes to disk** — imported notes now call `writeFile()` in Electron mode.
- **Folder mkdir** — creating a folder now calls `mkdir` on disk in Electron mode.
- **Sync race condition** — `onRemoteChange` gates behind `appReady` to prevent overwriting initial state.
- **useEffect deps** — initialization effect has `[]` dependency array.
- **Plugin crash guard** — `installedPluginIds` always a proper array, never undefined.

#### High (13)
- `exportNoteAsHTML()` no longer undefined — function exists and is invoked correctly.
- Empty trash shows confirmation dialog and calls permanent delete for each trashed note.
- Permanent delete (single + bulk) requires `confirm()` dialog.
- Back/forward navigation adds the target note to `openNoteIds`.
- Stale `isMobile` closure fixed in marketplace install callback.
- Vault load errors caught — shows welcome modal instead of blank screen.
- Ctrl+D delete requires confirmation before trashing.
- Keyboard shortcuts use `stateRef.current` — no stale closures, minimal deps `[patch, isMobile]`.
- Electron IPC listeners use refs (`createNoteRef`, `deleteNoteRef`, etc.) for stable callbacks.
- `switchWebVault` uses `stateRef.current` — stable, not recreated every render.
- Web vault data saved before switching to another vault.
- Google Sign-In `authInProgress` mutex prevents concurrent auth attempts.
- Chokidar file watcher closed before creating a new one.

#### Medium (12)
- Rebranded "Obsidian Cloud" → "Voltex Notes" in mobile drawer.
- Settings code preview updated from "Hello, Obsidian!" branding.
- Theme `useEffect` calls `applyTheme()` on theme change.
- Vault name creation uses inline input instead of `prompt()`.
- TitleBar back/forward buttons disabled when history is empty.
- Italic text uses foreground color instead of muted.
- Sliding panes feature functional.
- `createNote` no longer mutates `folders` array inside `setState`.
- Vault creation validates name input.
- Hover preview links are clickable.
- `autoUpdater.quitAndInstall()` wrapped in error handling.
- Splash window properly closed on startup errors.

#### Low (9)
- `drawingData` stored as HTML comment block instead of YAML frontmatter.
- YAML parsing replaced with `gray-matter` library.
- Regex patterns compiled once (not every render).
- `navigator.platform` replaced with `navigator.userAgentData`.
- Preload script event listener leak fixed.
- `FoldableHeading` has proper ARIA attributes.
- `JSON.parse` for drawingData wrapped in try/catch.
- OAuth flow mutex prevents simultaneous auth attempts.

### Changed
- `@excalidraw/excalidraw` v0.18.0 added as dependency.
- `gray-matter` v4.0.3 used for frontmatter serialization.
- `Editor.tsx` dynamically imports `ExcalidrawCanvas` with `ssr: false`.
- Landing page fonts: Kalam (headings) + Patrick Hand (body) via Google Fonts.

---

## [1.1.0] — 2026-03-15

### Added
- Live Preview mode powered by CodeMirror 6
- 15 new themes (One Dark Pro, Rosé Pine, Everforest, Ayu Dark, Kanagawa, etc.)
- Per-folder cloud sync with Firestore
- Vault sync prompt on sign-in
- Folder management (rename, delete) via right-click
- Create Vault from Settings
- Google Sign-In via system browser (Electron)
- Redesigned loading screen, splash screen, and OAuth pages
- Explorer header shows vault folder name
- rmdir and renameDir Electron IPC support

### Fixed
- Force sync no longer stuck on "Syncing…"
- File size consistency between root and folder notes
- Removed inaccessible default folders
- Mobile sidebar folder management support

---

## [1.0.0] — 2026-02-01

Initial release.
