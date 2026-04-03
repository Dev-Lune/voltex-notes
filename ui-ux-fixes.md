# Voltex Notes — Desktop UI/UX Issues Report

Scope: Electron desktop app UI. Covers `TitleBar`, `Editor`, `Sidebar`, `RightPanel`, `MobileNav`, and `ObsidianApp` overlay/modal layer.

---

## BROKEN / NON-FUNCTIONAL UI

### 1. Find/Replace — Previous and Next match buttons have no icons (invisible buttons)
**File:** `Editor.tsx:190–205`  
**Bug:** The "Previous match" and "Next match" buttons are completely empty — no icon, no text. The `<button>` elements exist with `aria-label` but the JSX body is blank. They are invisible and unclickable targets.  
**Fix:** Add `<ChevronUp size={13} />` and `<ChevronDown size={13} />` inside the respective buttons.

---

### 2. "Exit selection mode" button in Sidebar has no icon (invisible button)
**File:** `Sidebar.tsx:819–825`  
**Bug:** The ✕ button to exit multi-select mode is empty — `<button>...</button>` with no children. Users have no visual control to exit selection mode except re-clicking the checkbox icon.  
**Fix:** Add `<X size={12} />` inside the button.

---

### 3. Breadcrumb shows raw folder ID instead of folder name
**File:** `TitleBar.tsx:112`  
**Bug:** `<span>{activeNote.folder}</span>` renders the folder's internal ID (`"root"`, `"daily"`, `"drawings"`) not its display name. Every user sees their folder path as `root / Note Title`.  
**Fix:** Look up `state.folders.find(f => f.id === activeNote.folder)?.name ?? activeNote.folder` and render that instead.

---

### 4. Keyboard shortcut label shows Mac symbol `⌘P` on Windows
**File:** `TitleBar.tsx:141`  
**Bug:** The command palette search bar shows `⌘P` hardcoded. On Windows (primary Electron target) this is wrong — it should show `Ctrl+P`.  
**Fix:** Detect OS: `navigator.platform.toLowerCase().includes("mac")` (or `process.platform === "darwin"` via IPC), and render `⌘P` on Mac, `Ctrl+P` on Windows/Linux.

---

### 5. Tab bar — Kanban and Table notes show no icon
**File:** `Editor.tsx:684–686`  
**Bug:** The tab bar only renders icons for `drawing` and `daily` note types. `kanban`, `table`, and `markdown` tabs have no icon — they show just the title text. This is inconsistent since `NoteTypeIcon` handles all types.  
**Fix:** Replace the two hardcoded `note?.type === "drawing"` / `note?.type === "daily"` checks with `<NoteTypeIcon type={note?.type} size={10} />`.

---

### 6. Export as Markdown uses browser download, not native file dialog (Electron)
**File:** `Editor.tsx:1453–1459, 1344–1350`  
**Bug:** "Export as Markdown" creates a `<a download>` element and calls `.click()`. In Electron this triggers a web-style Downloads folder save with a browser download bar. There's no "Save as…" dialog, no choice of location, and no feedback once done.  
**Fix:** In Electron, call `window.electronAPI` (or a new IPC handler `dialog:saveFile`) to show a native Save dialog and write via `fsClient.writeFile`.

---

### 7. Explorer context menu shows Drawing/Kanban without checking installed plugins
**File:** `Sidebar.tsx:867–888`  
**Bug:** Right-clicking the file explorer shows "New Drawing" and "New Kanban Board" even when Excalidraw and Kanban plugins aren't installed. Clicking them creates a note that opens to a broken/empty editor.  
**Fix:** Filter these menu items the same way `NewNoteMenu` does: `!pluginId || installedPluginIds.includes(pluginId)`. Pass `state.installedPluginIds` down to this context menu.

---

### 8. "Table" note type exists but has no creation path
**File:** `data.ts:2` (`NoteType` includes `"table"`), `Sidebar.tsx:70–75`  
**Bug:** `NoteType` includes `"table"` and `NoteTypeBadge` renders it, but neither `NewNoteMenu`, the explorer context menu, nor `MobileNav.NewNoteMenu` has a "Table" option. Users can never create one from the UI.  
**Fix:** Either add it to the menus or remove `"table"` from `NoteType` entirely. Half-implemented types create confusion.

---

## SIGNIFICANT UX PROBLEMS

### 9. No visual indicator for unsaved/unsynced changes on tabs
**File:** `Editor.tsx:668–698` (TabBar)  
**Bug:** When a note has been edited but not yet synced (Firestore debounce = 500ms, Electron disk debounce = 300ms), the tab gives no visual feedback. Users don't know if their changes are safe. VS Code shows a dot `●` on unsaved tabs.  
**Fix:** Track a "dirty" note ID set in state (or compare `note.updatedAt` vs last-synced timestamp) and render a small dot indicator on the tab when the note has pending changes.

---

### 10. Pomodoro widget collides with plugin toast notification
**File:** `Editor.tsx:1657` vs `ObsidianApp.tsx:1372`  
**Bug:** Both the Pomodoro timer (`fixed bottom-6 right-6`) and the plugin install toast (`fixed bottom-6 left-1/2`) sit at the same vertical position. When a plugin is installed while the Pomodoro is running, they visually overlap or crowd each other.  
**Fix:** Offset the Pomodoro to `bottom-20` when a toast is visible, or stack them with distinct bottom values.

---

### 11. Bulk delete in selection mode has no confirmation
**File:** `Sidebar.tsx:543–547`  
**Bug:** "Delete" in multi-select mode calls `onDeleteNote(id)` for every selected note immediately with no confirmation. Selecting all + delete is one accidental click away from trashing everything.  
**Fix:** Show a confirmation: `"Move X notes to Trash?"` with Cancel/Confirm before executing bulk delete.

---

### 12. Sort order in Sidebar resets to "modified" on every reload
**File:** `Sidebar.tsx:455`  
**Bug:** `const [sortMode, setSortMode] = useState<SortMode>("modified")` — sort preference is local state only. Every time the page reloads, the user's sort choice is forgotten.  
**Fix:** Persist to `localStorage.setItem("voltex-sort-mode", sortMode)` on change, and read it back on mount.

---

### 13. Tab bar scrollbar is hidden but tabs can overflow (no scroll affordance)
**File:** `Editor.tsx:661`  
**Bug:** The tab bar uses `overflow-x-auto` but there's no custom scrollbar and on Windows the default thin OS scrollbar is barely visible. With many open notes the bar scrolls but users don't know it. There's also no "scroll to active tab" behavior when opening a note whose tab is off-screen.  
**Fix:** Add a visible scrollbar with `scrollbar-thin scrollbar-track-transparent scrollbar-thumb-obsidian-border`, and scroll the active tab into view with `scrollIntoView({ inline: "nearest" })` when `activeNoteId` changes.

---

### 14. Tab close button only shows on hover — hard to discover
**File:** `Editor.tsx:687–693`  
**Bug:** `opacity-0 group-hover:opacity-100` makes the close button invisible until the user hovers. On touch-capable Windows devices or for new users, this is completely hidden. Active tab close button should always be visible.  
**Fix:** Always show the close `×` on the active tab: `opacity: id === activeNoteId ? 1 : undefined` + group-hover for inactive tabs.

---

### 15. Back/Forward navigation buttons always look enabled
**File:** `TitleBar.tsx:86–101`  
**Bug:** Back and Forward buttons are always the same color and style regardless of whether navigation is possible. Clicking Back at the start of history is a silent no-op. No affordance communicates the buttons are inactive.  
**Fix:** Pass `canGoBack` / `canGoForward` boolean props from `ObsidianApp` and apply `opacity-30 cursor-not-allowed pointer-events-none` when inactive. The values are readable from `historyIdxRef`.

---

### 16. Sync badge shown in sidebar even when user has never signed in
**File:** `Sidebar.tsx:831`  
**Bug:** `<SyncBadge status={syncStatus} />` always renders "Offline" in grey under the panel header, even for users who have never set up cloud sync and don't intend to. It's visual noise for local-only or Electron vault users.  
**Fix:** Conditionally render the badge only when `state.user !== null` or `state.syncStatus !== "offline"`.

---

### 17. Electron window title is always "Voltex Notes" — doesn't show current note
**Bug:** In Electron the window/taskbar title stays as `"Voltex Notes"` regardless of which note is open. Real note-taking apps show `"Note Title — Vault Name"` in the title bar so users can see it in Alt+Tab.  
**Fix:** Send the active note title to main process via IPC: `window.electronAPI.setWindowTitle(title)`, and implement `mainWindow.setTitle(title)` in the Electron main process.

---

### 18. No "Open Vault" / "Switch Vault" option after initial setup (Electron)
**File:** `ObsidianApp.tsx:1313`  
**Bug:** `onOpenVault` is only available inside the WelcomeModal. Once dismissed, there's no way for an Electron user to switch vaults, open a different vault, or access recent vaults without clearing `localStorage` and reloading.  
**Fix:** Add a "Switch Vault…" item to the Settings → General tab (or the TitleBar ⋮ menu) that calls `vaultClient.open()` and `loadVault()`.

---

### 19. "Create New Vault" uses `prompt()` — native but unstyled and jarring
**File:** `ObsidianApp.tsx:1323`  
**Bug:** `prompt("Vault name:")` shows a plain OS dialog that looks out of place in the styled Electron app. On some Electron security configurations, `window.prompt` is disabled entirely.  
**Fix:** Replace with an inline text input field inside the WelcomeModal vault creation section. A one-field form doesn't need a modal-within-a-modal.

---

### 20. Right Panel tab bar overflows on small screens with all plugins installed
**File:** `RightPanel.tsx` (tab list)  
**Bug:** With all 3 plugin tabs added (Heatmap, Flashcards, Mind Map), the right panel now has 8 tabs. At 200–240px panel width each tab becomes ~25px wide — too small to read. No overflow handling exists.  
**Fix:** Either horizontally scroll the tab list with `overflow-x-auto`, or collapse to an icon-only mode when tabs overflow.

---

## MINOR / POLISH

### 21. Mobile Drawer title shows "Obsidian Cloud" — wrong brand name
**File:** `ObsidianApp.tsx:1145`  
`title="Obsidian Cloud"` should be `title="Voltex Notes"`.

---

### 22. Toolbar shows two ways to create notes with different behavior
**File:** `Editor.tsx:1538–1546`  
**Bug:** The toolbar has both a `+` icon button (opens the type picker menu) and a blue "New" button (creates a markdown note directly). They look like duplicates to users. The inconsistency is confusing.  
**Fix:** Remove the blue "New" button from the toolbar. The `+` icon with type picker is sufficient and already has `Ctrl+N` as shortcut.

---

### 23. FrontmatterEditor destroys array fields when user edits them
**File:** `Editor.tsx:499–517`  
**Bug:** `parseFrontmatter` in the editor splits on the first `:` per line and treats every line as a flat scalar `key: value`. When it re-serializes with `rebuildContent`, array fields (like `tags: ["a", "b"]`) get collapsed to a single string `tags: ["a", "b"]` which `markdownToNote` will misparse. Editing frontmatter through this UI can corrupt the note's tags and type.  
**Fix:** Either make the editor read-only for known structured fields (id, tags, type), or use a proper YAML renderer per field type.

---

### 24. Drag ghost from file tree is the default browser drag ghost (ugly)
**File:** `Sidebar.tsx:186–190`  
**Bug:** Note drag-and-drop uses the default browser drag image — a semi-transparent snapshot of the DOM element. On Electron/Windows this can look blurry or show stale CSS.  
**Fix:** Call `e.dataTransfer.setDragImage(customEl, 0, 0)` with a small custom element showing just the note icon + title.

---

### 25. Find/Replace "No results" shows even before the user has typed anything
**File:** `Editor.tsx:160–162`  
**Bug:** When the Find dialog opens, the match counter shows `"No results"` immediately (before any input), because `findText` is empty and `matches.length === 0`.  
**Fix:** Show nothing when `findText === ""`, only show `"No results"` when `findText !== ""` and `matches.length === 0`.

---

## Summary Table

| # | Area | Severity | Issue |
|---|------|----------|-------|
| 1 | Find/Replace | BROKEN | Prev/Next match buttons have no icons — invisible |
| 2 | Sidebar | BROKEN | Exit selection mode button is empty — invisible |
| 3 | TitleBar | BROKEN | Breadcrumb shows raw folder ID not name |
| 4 | TitleBar | BROKEN | `⌘P` shown on Windows (should be `Ctrl+P`) |
| 5 | Editor Tabs | BROKEN | Kanban/Table note types missing icons in tab bar |
| 6 | Editor | HIGH | "Export as Markdown" uses browser download, not native dialog |
| 7 | Sidebar | HIGH | Explorer context menu shows locked note types (Drawing/Kanban) without plugin check |
| 8 | Sidebar | HIGH | "Table" note type is unreachable — no create option in any menu |
| 9 | Editor Tabs | HIGH | No unsaved/pending-sync indicator on tabs |
| 10 | Editor | HIGH | Pomodoro widget overlaps plugin install toast |
| 11 | Sidebar | HIGH | Bulk delete has no confirmation dialog |
| 12 | Sidebar | HIGH | Sort order resets on reload — not persisted |
| 13 | Editor Tabs | MEDIUM | Tab bar has no visible scrollbar or scroll-to-active behavior |
| 14 | Editor Tabs | MEDIUM | Tab close button hidden until hover — hard to discover |
| 15 | TitleBar | MEDIUM | Back/Forward buttons always appear enabled |
| 16 | Sidebar | MEDIUM | Sync badge shown when user is not signed in |
| 17 | Electron | MEDIUM | Window title is always "Voltex Notes" — doesn't reflect active note |
| 18 | Electron | MEDIUM | No way to switch/open vault after welcome modal is dismissed |
| 19 | Electron | MEDIUM | `prompt()` used for vault name — unstyled OS dialog |
| 20 | RightPanel | MEDIUM | 8 tabs overflow at 200–240px panel width with all plugins |
| 21 | Mobile | LOW | Mobile drawer title still says "Obsidian Cloud" |
| 22 | Editor | LOW | Two "New note" controls in toolbar with different behavior |
| 23 | Editor | LOW | FrontmatterEditor corrupts array fields on edit |
| 24 | Sidebar | LOW | Default browser drag ghost looks bad in Electron |
| 25 | Find/Replace | LOW | "No results" shown before user types anything |
