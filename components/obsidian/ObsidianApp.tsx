"use client";

import React, { useState, useCallback, useEffect, useRef, useId } from "react";
import dynamic from "next/dynamic";
import {
  AppState, Note, Folder, SAMPLE_NOTES, SAMPLE_FOLDERS, SAMPLE_NOTE_IDS,
  countWords, NoteType, THEMES, DEFAULT_PREFERENCES, EditorPreferences, applyTheme,
  Vault
} from "./data";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";
import Editor from "./Editor";
import RightPanel from "./RightPanel";
import CommandPalette from "./CommandPalette";
import AuthModal from "./AuthModal";
import ConfirmDialog from "./ConfirmDialog";
import PetCompanion from "./PetCompanion";
import MobileDesktopHint from "./MobileDesktopHint";
import { VoltexStage } from "../marketing/VoltexStage";
import { SAMPLE_SNIPPETS } from "../../lib/marketplace/data";

// Heavy components — lazy-loaded to reduce initial bundle
const GraphView = dynamic(() => import("./GraphView"), { ssr: false });
const CanvasView = dynamic(() => import("./CanvasView"), { ssr: false });
const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });
const MarketplacePanel = dynamic(() => import("./MarketplacePanel"), { ssr: false });

import {
  MobileHeader,
  MobileBottomNav,
  MobileDrawer,
  NewNoteMenu,
  useMobile,
  useSwipe,
  useSmallDesktop,
  useViewportWidth,
} from "./MobileNav";
import { SyncService } from "@/lib/firebase/sync";
import { isElectron, vaultClient, fsClient, windowClient, electronOn, updaterClient } from "@/lib/vault/client";
import { noteToMarkdown, markdownToNote, noteFilePath } from "@/lib/vault/serializer";
import {
  X, FileEdit, Link2, Package,
  Search as SearchIcon,
  Command, Cloud,
  BookOpen, FolderOpen, Check,
  Crown, User, Settings, LogIn, FileText, HardDrive,
} from "lucide-react";

const INITIAL_STATE: AppState = {
  notes: SAMPLE_NOTES,
  folders: SAMPLE_FOLDERS,
  activeNoteId: SAMPLE_NOTES[0].id,
  openNoteIds: [SAMPLE_NOTES[0].id, SAMPLE_NOTES[1].id, SAMPLE_NOTES[2].id],
  sidebarView: "files",
  viewMode: "live",
  mainView: "editor",
  rightPanelOpen: true,
  rightPanelTab: "backlinks",
  searchQuery: "",
  commandPaletteOpen: false,
  authModalOpen: false,
  settingsOpen: false,
  sidebarCollapsed: false,
  syncStatus: "synced",
  user: null,
  activeThemeId: "voltex-dark",
  newNoteTypeMenuOpen: false,
  marketplaceOpen: false,
  installedPluginIds: ["excalidraw", "obsidian-kanban"],
  enabledSnippetIds: [],
  preferences: DEFAULT_PREFERENCES,
};

const MAX_NOTE_VERSIONS = 50;

// Plugin access locations — shown as toast after install
const PLUGIN_HINTS: Record<string, string> = {
  "pomodoro": "Pomodoro Timer activated! Floating timer appears at the bottom-right.",
  "ai-assistant": "Writing Analytics ready! Access via ⋮ menu → Writing Analytics.",
  "obsidian-git": "Git History ready! Access via ⋮ menu → Version History.",
  "obsidian-publish-plus": "Publish Plus ready! Access via ⋮ menu → Export as HTML.",
  "citations": "Citations ready! Access via ⋮ menu → Insert Citation. Use [@key] in notes.",
  "sliding-panes": "Sliding Panes ready! Toggle via the ⇄ button in the toolbar (needs 2+ notes open).",
  "advanced-tables": "Advanced Tables active! Use Tab/Shift+Tab to navigate table cells.",
  "natural-language-dates": "Natural Language Dates active! Type @today, @tomorrow, @now in the editor.",
  "heatmap-calendar": "Heatmap Calendar added! Check the new 🔥 tab in the right panel.",
  "spaced-repetition": "Flashcards added! Check the new 📖 tab in the right panel. Add Q:/A: pairs to notes.",
  "mind-map": "Mind Map added! Check the new 🧠 tab in the right panel.",
  "excalidraw": "Excalidraw ready! Create a Drawing note from the + menu.",
  "obsidian-kanban": "Kanban ready! Create a Kanban note from the + menu.",
};

export default function ObsidianApp() {
  // Initial render is always blank — both SSR and first client paint match.
  // The first-run effect below reads localStorage and populates the real state
  // before flipping `appReady`, which is what gates the UI render. This way no
  // sample/onboarding notes ever flash before the user has chosen them.
  const [state, setState] = useState<AppState>(() => ({
    ...INITIAL_STATE,
    notes: [],
    folders: [{ id: "root", name: "Vault", parentId: null }],
    activeNoteId: null,
    openNoteIds: [],
  }));
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const syncServiceRef = useRef<SyncService | null>(null);
  const pushDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Mobile state
  const isMobile = useMobile();
  const isSmallDesktop = useSmallDesktop();
  const viewportWidth = useViewportWidth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"home" | "search" | "graph" | "new" | "settings" | "panel">("home");
  const [mobileNewNoteMenuOpen, setMobileNewNoteMenuOpen] = useState(false);
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false);

  // Welcome / workspace setup state
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [pluginToast, setPluginToast] = useState<{ message: string; visible: boolean } | null>(null);
  const [vaultNameInput, setVaultNameInput] = useState<{ parentPath: string } | null>(null);

  // ── Confirmation dialog (replaces native confirm()) ────────────────────────
  type ConfirmState = {
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    tone?: "danger" | "warning" | "info";
    requireTypedConfirmation?: string;
    onConfirm: () => void;
  };
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const askConfirm = useCallback((cfg: ConfirmState) => setConfirmDialog(cfg), []);

  // ── Auto-updater state ─────────────────────────────────────────────────────
  const [updateReady, setUpdateReady] = useState<string | null>(null);

  // ── Vault (Electron desktop only) ──────────────────────────────────────────
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [recentVaults, setRecentVaults] = useState<Array<{ path: string; name: string; lastOpened: number }>>([]);
  const vaultSaveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Tracks per-note "session start" content for version-history snapshotting.
  // We snapshot when an editing session ends (user idle ≥ 30s, or large delta).
  const versionSessionRef = useRef<Map<string, { baseContent: string; baseTitle: string; baseUpdatedAt: string; lastEditAt: number; idleTimer: ReturnType<typeof setTimeout> | null }>>(new Map());
  const fileWatcherCleanupRef = useRef<(() => void) | null>(null);
  const [dirtyNoteIds, setDirtyNoteIds] = useState<Set<string>>(new Set());
  const [syncPromptVisible, setSyncPromptVisible] = useState(false);
  const sidebarSelectAllRef = useRef<{ selectAll: () => void } | null>(null);

  // ── Web Vault Management ───────────────────────────────────────────────────
  const [webVaults, setWebVaults] = useState<Vault[]>(() => {
    if (typeof window === "undefined" || isElectron()) return [];
    try {
      const saved = localStorage.getItem("voltex-vaults");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeWebVaultId, setActiveWebVaultId] = useState<string | null>(() => {
    if (typeof window === "undefined" || isElectron()) return null;
    try {
      return localStorage.getItem("voltex-active-vault-id") || null;
    } catch { return null; }
  });

  const patch = useCallback((p: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  // ── Web vault helpers ───────────────────────────────────────────────────────
  const saveWebVaultData = useCallback((vaultId: string, notes: Note[], folders: Folder[]) => {
    if (isElectron()) return;
    try {
      // Never persist built-in onboarding/sample notes into a real vault.
      const userNotes = notes.filter((n) => !SAMPLE_NOTE_IDS.has(n.id));
      localStorage.setItem(`voltex-vault-${vaultId}-notes`, JSON.stringify(userNotes));
      localStorage.setItem(`voltex-vault-${vaultId}-folders`, JSON.stringify(folders));
    } catch { /* storage full */ }
  }, []);

  const loadWebVaultData = useCallback((vaultId: string): { notes: Note[]; folders: Folder[] } | null => {
    if (isElectron()) return null;
    try {
      const notesRaw = localStorage.getItem(`voltex-vault-${vaultId}-notes`);
      const foldersRaw = localStorage.getItem(`voltex-vault-${vaultId}-folders`);
      if (!notesRaw) return null;
      return {
        notes: JSON.parse(notesRaw),
        folders: foldersRaw ? JSON.parse(foldersRaw) : [{ id: "root", name: "Vault", parentId: null }],
      };
    } catch { return null; }
  }, []);

  const createWebVault = useCallback((name: string) => {
    if (isElectron()) return;
    const id = `vault-${Date.now()}`;
    const newVault: Vault = { id, name, createdAt: new Date().toISOString() };
    // Start with an empty vault — the user creates their first note when ready.
    const folders: Folder[] = [{ id: "root", name, parentId: null }];
    saveWebVaultData(id, [], folders);

    const updated = [...webVaults, newVault];
    setWebVaults(updated);
    try { localStorage.setItem("voltex-vaults", JSON.stringify(updated)); } catch { /* ignore */ }

    // Switch to the new vault
    switchWebVault(id, updated);
  }, [webVaults, saveWebVaultData]);

  const switchWebVault = useCallback((vaultId: string, vaultsList?: Vault[]) => {
    if (isElectron()) return;
    // Flush current vault data before switching (H11: prevent data loss)
    const cur = stateRef.current;
    const curVaultId = activeWebVaultId;
    if (curVaultId) {
      saveWebVaultData(curVaultId, cur.notes, cur.folders);
    }

    const data = loadWebVaultData(vaultId);
    const vaults = vaultsList || webVaults;
    const vault = vaults.find(v => v.id === vaultId);
    setActiveWebVaultId(vaultId);
    try { localStorage.setItem("voltex-active-vault-id", vaultId); } catch { /* ignore */ }

    if (data && data.notes.length > 0) {
      setState((prev) => ({
        ...prev,
        notes: data.notes,
        folders: data.folders,
        activeNoteId: data.notes[0].id,
        openNoteIds: [data.notes[0].id],
        mainView: data.notes[0].type === "canvas" ? "canvas" : "editor",
        activeVaultId: vaultId,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        notes: [],
        folders: [{ id: "root", name: vault?.name || "Vault", parentId: null }],
        activeNoteId: null,
        openNoteIds: [],
        mainView: "editor",
        activeVaultId: vaultId,
      }));
    }
  }, [activeWebVaultId, webVaults, saveWebVaultData, loadWebVaultData]);

  // Auto-save web vault data periodically
  useEffect(() => {
    if (isElectron() || !activeWebVaultId) return;
    const timer = setTimeout(() => {
      saveWebVaultData(activeWebVaultId, state.notes, state.folders);
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.notes, state.folders, activeWebVaultId, saveWebVaultData]);

  // ── Vault helpers (Electron) ────────────────────────────────────────────────
  const loadVault = useCallback(async (vaultDir: string) => {
    // Clean up previous file watcher
    if (fileWatcherCleanupRef.current) {
      fileWatcherCleanupRef.current();
      fileWatcherCleanupRef.current = null;
    }
    const filePaths = await fsClient.listFiles(vaultDir);
    const notes: Note[] = (await Promise.all(
      filePaths.map(async (fp: string) => {
        const raw = await fsClient.readFile(fp);
        if (raw === null) return null;
        return markdownToNote(fp, raw);
      })
    )).filter((n): n is Note => n !== null);

    // Build folders from subdirectories found in file paths
    const folderSet = new Set<string>();
    const vaultDirNorm = vaultDir.replace(/\\/g, "/");
    for (const fp of filePaths) {
      const rel = fp.replace(/\\/g, "/").replace(vaultDirNorm + "/", "");
      const parts = rel.split("/");
      if (parts.length > 1) {
        folderSet.add(parts[0]); // first directory level
      }
    }
    const folders: Folder[] = [
      { id: "root", name: "Vault", parentId: null },
      ...Array.from(folderSet).map((name) => ({ id: name, name, parentId: "root" as string | null })),
    ];

    // Assign notes to their folder based on file path
    for (const note of notes) {
      const rel = (note.filePath || "").replace(/\\/g, "/").replace(vaultDirNorm + "/", "");
      const parts = rel.split("/");
      if (parts.length > 1 && folderSet.has(parts[0])) {
        note.folder = parts[0];
      } else {
        note.folder = "root";
      }
    }

    await vaultClient.setRecent(vaultDir);
    setVaultPath(vaultDir);
    if (notes.length > 0) {
      patch({
        notes,
        folders,
        activeNoteId: notes[0].id,
        openNoteIds: [notes[0].id],
      });
    } else {
      // Leave the vault empty — do NOT auto-create an "Untitled" note. The user
      // can use Ctrl/Cmd+N or the FAB to create their first note when ready.
      patch({
        notes: [],
        folders: folders.length > 0 ? folders : [{ id: "root", name: "Vault", parentId: null }],
        activeNoteId: null,
        openNoteIds: [],
      });
    }
    setAppReady(true);
    // Start watching for external changes
    // First, tell the main process to start chokidar on this vault
    await fsClient.watch(vaultDir);
    // Then listen for change events from the watcher
    fileWatcherCleanupRef.current = fsClient.onFileChanged(async (changedPath: string) => {
      const raw = await fsClient.readFile(changedPath);
      if (raw === null) return; // file was deleted externally
      const updated = markdownToNote(changedPath, raw);
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.filePath === changedPath ? updated : n)),
      }));
    });
  }, [patch]);

  // Ensure a guest web vault exists so notes/folders auto-save on refresh.
  // Returns the active vault id (existing or freshly created).
  const ensureGuestVault = useCallback((): string | undefined => {
    if (typeof window === "undefined" || isElectron()) return undefined;
    let vid: string | null = null;
    try { vid = localStorage.getItem("voltex-active-vault-id"); } catch { /* ignore */ }
    if (vid) return vid;
    vid = `vault-${Date.now()}`;
    const v: Vault = { id: vid, name: "My Notes", createdAt: new Date().toISOString() };
    try {
      const existingRaw = localStorage.getItem("voltex-vaults");
      const existing: Vault[] = existingRaw ? JSON.parse(existingRaw) : [];
      const list = [...existing, v];
      localStorage.setItem("voltex-vaults", JSON.stringify(list));
      localStorage.setItem("voltex-active-vault-id", vid);
      setWebVaults(list);
    } catch { /* ignore */ }
    setActiveWebVaultId(vid);
    return vid;
  }, []);

  // Open vault + optionally show sync prompt
  const openVaultWithPrompt = useCallback(async (vaultDir: string) => {
    await loadVault(vaultDir);
    // If user is signed in, prompt to sync
    if (state.user) {
      setSyncPromptVisible(true);
    }
  }, [loadVault, state.user]);

  // First-run detection: show welcome modal and/or workspace setup
  useEffect(() => {
    // ── Electron: auto-open last vault ──────────────────────────────────
    if (isElectron()) {
      vaultClient.listRecent().then(async (recents) => {
        setRecentVaults(recents);
        if (recents.length > 0) {
          try {
            await loadVault(recents[0].path);
          } catch {
            setAppReady(true);
            setWelcomeModalOpen(true);
          }
          return;
        }
        // No recent vault — show welcome
        setWelcomeModalOpen(true);
      });
      return;
    }

    try {
      const welcomeDismissed = localStorage.getItem("voltex-welcome-dismissed");
      const workspaceConfigured = localStorage.getItem("voltex-workspace-configured");
      const activeVaultId = localStorage.getItem("voltex-active-vault-id");

      // 1) Active web vault → hydrate its notes/folders.
      if (activeVaultId) {
        const data = loadWebVaultData(activeVaultId);
        if (data && data.notes.length > 0) {
          const liveNotes = data.notes.filter((n) => !n.trashed);
          const first = liveNotes[0] ?? data.notes[0];
          setState((prev) => ({
            ...prev,
            notes: data.notes,
            folders: data.folders,
            activeNoteId: first?.id ?? null,
            openNoteIds: first ? [first.id] : [],
            mainView: first?.type === "canvas" ? "canvas" : "editor",
            activeVaultId,
          }));
          setAppReady(true);
          return;
        }
        // Vault exists but is empty — keep it active so new notes save.
        setState((prev) => ({ ...prev, activeVaultId }));
        setAppReady(true);
        return;
      }

      // 2) Returning user who chose "docs" → re-seed sample notes.
      if (workspaceConfigured === "docs") {
        const vid = ensureGuestVault();
        setState((prev) => ({
          ...prev,
          notes: SAMPLE_NOTES,
          folders: SAMPLE_FOLDERS,
          activeNoteId: SAMPLE_NOTES[0].id,
          openNoteIds: [SAMPLE_NOTES[0].id, SAMPLE_NOTES[1]?.id, SAMPLE_NOTES[2]?.id].filter(Boolean) as string[],
          activeVaultId: vid,
        }));
        setAppReady(true);
        return;
      }

      // 3) Workspace was set to empty, or welcome was previously dismissed →
      //    leave the blank state from the initializer in place, but make sure
      //    a vault exists so new notes get saved on refresh.
      if (workspaceConfigured === "empty" || welcomeDismissed) {
        const vid = ensureGuestVault();
        setState((prev) => ({ ...prev, activeVaultId: vid }));
        setAppReady(true);
        return;
      }

      // 4) Brand-new visitor → show welcome dialog (state stays blank).
      setWelcomeModalOpen(true);
    } catch {
      setAppReady(true);
    }
  }, [loadWebVaultData, ensureGuestVault]);

  // Auto-collapse right panel on small desktop viewports
  useEffect(() => {
    if (isMobile) return;
    if (viewportWidth > 0 && viewportWidth < 1280) {
      patch({ rightPanelOpen: false });
    }
  }, [viewportWidth, isMobile, patch]);

  // Apply theme + persist
  const themeLoadedRef = useRef(false);
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === state.activeThemeId) ?? THEMES[0];
    applyTheme(theme);
    // Sync Electron window background color with theme
    if (isElectron()) {
      const bgColor = theme.vars["--obs-bg"] ?? "#1e1e2e";
      windowClient.setBackgroundColor(bgColor);
    }
    // Save to localStorage — but only after the load effect has had a chance
    // to hydrate from storage. Otherwise the default "voltex-dark" overwrites
    // a previously saved theme on first render.
    if (!themeLoadedRef.current) return;
    try { localStorage.setItem("voltex-theme", state.activeThemeId); } catch { /* ignore */ }
  }, [state.activeThemeId]);

  // Update document/window title when active note changes
  useEffect(() => {
    const activeNote = state.notes.find((n) => n.id === state.activeNoteId);
    const title = activeNote ? `${activeNote.title} — Voltex Notes` : "Voltex Notes";
    document.title = title;
    if (isElectron()) {
      windowClient.setTitle(title);
    }
  }, [state.activeNoteId, state.notes]);

  // Load saved theme + preferences from localStorage on mount (guest persistence)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("voltex-theme");
      if (saved && THEMES.find((t) => t.id === saved)) {
        patch({ activeThemeId: saved });
      }
      const prefsRaw = localStorage.getItem("voltex-preferences");
      if (prefsRaw) {
        try {
          const parsed = JSON.parse(prefsRaw) as Partial<EditorPreferences>;
          patch({ preferences: { ...DEFAULT_PREFERENCES, ...parsed } });
        } catch { /* ignore corrupt prefs */ }
      }
      const petEnabledRaw = localStorage.getItem("voltex-pet-enabled");
      const petType = localStorage.getItem("voltex-pet-type");
      const petPatch: Partial<AppState> = {};
      if (petEnabledRaw !== null) petPatch.petEnabled = petEnabledRaw === "true";
      if (petType) petPatch.petType = petType as AppState["petType"];
      if (Object.keys(petPatch).length) patch(petPatch);
    } catch { /* ignore */ }
    // Mark theme as loaded so the persist effect can begin writing.
    themeLoadedRef.current = true;
  }, [patch]);

  // Persist editor preferences whenever they change (after first load).
  const prefsLoadedRef = useRef(false);
  useEffect(() => {
    if (!prefsLoadedRef.current) {
      prefsLoadedRef.current = true;
      return;
    }
    try {
      localStorage.setItem("voltex-preferences", JSON.stringify(state.preferences));
    } catch { /* ignore */ }
  }, [state.preferences]);

  // Persist pet settings whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem("voltex-pet-enabled", state.petEnabled ? "true" : "false");
      if (state.petType) localStorage.setItem("voltex-pet-type", state.petType);
    } catch { /* ignore */ }
  }, [state.petEnabled, state.petType]);

  // Restore Firebase auth session on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let initialSyncDone = false;
    (async () => {
      try {
        const { getFirebaseAuth, getFirebaseDb } = await import("@/lib/firebase/config");
        const { onAuthStateChanged } = await import("firebase/auth");
        const { doc, getDoc } = await import("firebase/firestore");
        const auth = getFirebaseAuth();
        if (!auth) return;
        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            patch({
              user: {
                email: fbUser.email || "",
                displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
                uid: fbUser.uid,
                photoURL: fbUser.photoURL || undefined,
              },
              syncStatus: "syncing",
            });

            // Load theme + workspace preference from Firestore.
            // Account-level preferences win over local session.
            try {
              const db = getFirebaseDb();
              if (db) {
                const prefSnap = await getDoc(doc(db, "users", fbUser.uid, "settings", "preferences"));
                if (prefSnap.exists()) {
                  const data = prefSnap.data();
                  if (data.activeThemeId && THEMES.find((t) => t.id === data.activeThemeId)) {
                    patch({ activeThemeId: data.activeThemeId });
                  }
                  // Workspace choice: "docs" or "empty"
                  if (data.workspaceChoice === "empty" || data.workspaceChoice === "docs") {
                    try { localStorage.setItem("voltex-workspace-configured", data.workspaceChoice); } catch { /* ignore */ }
                    if (data.workspaceChoice === "empty") {
                      // Strip any sample/doc notes that were seeded pre-login.
                      setState((prev) => {
                        const userNotes = prev.notes.filter((n) => !SAMPLE_NOTE_IDS.has(n.id));
                        if (userNotes.length === prev.notes.length) return prev;
                        const first = userNotes[0];
                        return {
                          ...prev,
                          notes: userNotes,
                          activeNoteId: first?.id ?? null,
                          openNoteIds: first ? [first.id] : [],
                        };
                      });
                    }
                  } else {
                    // No saved choice yet → persist whatever the local session picked.
                    const localChoice = (() => { try { return localStorage.getItem("voltex-workspace-configured"); } catch { return null; } })();
                    if (localChoice === "docs" || localChoice === "empty") {
                      const { setDoc } = await import("firebase/firestore");
                      await setDoc(
                        doc(db, "users", fbUser.uid, "settings", "preferences"),
                        { workspaceChoice: localChoice },
                        { merge: true }
                      );
                    }
                  }
                }
              }
            } catch { /* ignore */ }

            // Initialize SyncService for real-time note sync
            try {
              // Destroy previous instance if any
              if (syncServiceRef.current) {
                await syncServiceRef.current.destroy();
              }
              initialSyncDone = false;
              const service = new SyncService(fbUser.uid);

              // Listen for status changes
              service.onStatusChange((status) => {
                patch({ syncStatus: status });
              });

              // Listen for remote note changes (real-time sync)
              // Gate behind appReady to avoid overwriting state before init completes
              service.onRemoteChange((remoteNotes) => {
                if (!appReady) return;
                setState((prev) => {
                  // First sync: if Firestore is empty, push local notes
                  if (remoteNotes.length === 0 && prev.notes.length > 0 && !initialSyncDone) {
                    initialSyncDone = true;
                    service.syncAll(prev.notes);
                    return { ...prev, syncStatus: "synced" };
                  }
                  initialSyncDone = true;

                  // Merge remote notes, preserving local-only fields
                  const mergedNotes = remoteNotes.map((remote) => {
                    const local = prev.notes.find((n) => n.id === remote.id);
                    return {
                      ...remote,
                      wordCount: countWords(remote.content),
                      versionHistory: local?.versionHistory,
                      drawingData: remote.drawingData || local?.drawingData,
                    };
                  });

                  // Rebuild folders from remote notes folder IDs
                  const remoteFolderIds = new Set<string>();
                  for (const n of mergedNotes) {
                    if (n.folder && n.folder !== "root") remoteFolderIds.add(n.folder);
                  }
                  // Merge with existing folders (keep local folders too)
                  const existingFolderMap = new Map(prev.folders.map(f => [f.id, f]));
                  for (const fid of remoteFolderIds) {
                    if (!existingFolderMap.has(fid)) {
                      existingFolderMap.set(fid, { id: fid, name: fid, parentId: "root", synced: true });
                    }
                  }
                  const mergedFolders = Array.from(existingFolderMap.values());

                  // Fix active/open note IDs to valid notes
                  const noteIds = new Set(mergedNotes.map((n) => n.id));
                  const newOpenNoteIds = prev.openNoteIds.filter((id) => noteIds.has(id));
                  let newActiveNoteId = prev.activeNoteId && noteIds.has(prev.activeNoteId)
                    ? prev.activeNoteId
                    : mergedNotes[0]?.id ?? null;
                  if (newOpenNoteIds.length === 0 && mergedNotes.length > 0) {
                    newOpenNoteIds.push(mergedNotes[0].id);
                    newActiveNoteId = mergedNotes[0].id;
                  }

                  return {
                    ...prev,
                    notes: mergedNotes,
                    folders: mergedFolders,
                    activeNoteId: newActiveNoteId,
                    openNoteIds: newOpenNoteIds,
                  };
                });
              });

              syncServiceRef.current = service;

              // Fetch synced folders from Firestore (full objects with names)
              service.fetchSyncedFolders().then((remoteFolders) => {
                if (remoteFolders.length > 0) {
                  const ids = remoteFolders.map(f => f.id);
                  patch({ syncedFolderIds: ids });
                  // Merge remote folder metadata into state so names are correct
                  setState((prev) => {
                    const folderMap = new Map(prev.folders.map(f => [f.id, f]));
                    for (const rf of remoteFolders) {
                      if (!folderMap.has(rf.id)) {
                        folderMap.set(rf.id, rf);
                      } else {
                        // Update name from cloud if the local name is just the ID (placeholder)
                        const existing = folderMap.get(rf.id)!;
                        if (existing.name === existing.id) {
                          folderMap.set(rf.id, { ...existing, name: rf.name, synced: true });
                        }
                      }
                    }
                    return { ...prev, folders: Array.from(folderMap.values()) };
                  });
                }
              });

              await service.initialize();
            } catch { /* SyncService init failed — ignore */ }
          } else {
            // User logged out
            if (syncServiceRef.current) {
              await syncServiceRef.current.destroy();
              syncServiceRef.current = null;
            }
            patch({ user: null, syncStatus: "offline" });
          }
        });
      } catch { /* Firebase not configured — ignore */ }
    })();
    return () => {
      unsubscribe?.();
      // Cleanup sync service on unmount
      if (syncServiceRef.current) {
        syncServiceRef.current.destroy();
        syncServiceRef.current = null;
      }
    };
  }, [patch, appReady]);

  // Push note to Firestore (debounced per note)
  const pushNoteToFirestore = useCallback((note: Note) => {
    const service = syncServiceRef.current;
    if (!service) return;
    const existing = pushDebounceRef.current.get(note.id);
    if (existing) clearTimeout(existing);
    pushDebounceRef.current.set(
      note.id,
      setTimeout(() => {
        service.pushNote(note);
        pushDebounceRef.current.delete(note.id);
      }, 500)
    );
  }, []);

  // Delete note from Firestore (immediate)
  const deleteNoteFromFirestore = useCallback((noteId: string) => {
    const service = syncServiceRef.current;
    if (!service) return;
    // Cancel any pending push for this note
    const pending = pushDebounceRef.current.get(noteId);
    if (pending) {
      clearTimeout(pending);
      pushDebounceRef.current.delete(noteId);
    }
    service.deleteNote(noteId);
  }, []);

  // Open note with history tracking
  const openNote = useCallback(
    (id: string) => {
      setState((prev) => {
        const alreadyOpen = prev.openNoteIds.includes(id);
        const newOpen = alreadyOpen
          ? prev.openNoteIds
          : [...prev.openNoteIds, id];
        const note = prev.notes.find((n) => n.id === id);
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: newOpen,
          mainView: note?.type === "canvas" ? "canvas" : "editor",
        };
      });
      // Update history
      const history = historyRef.current;
      const idx = historyIdxRef.current;
      historyRef.current = [...history.slice(0, idx + 1), id];
      historyIdxRef.current = historyRef.current.length - 1;
      // Close drawer on mobile
      if (isMobile) {
        setMobileDrawerOpen(false);
        setMobileView("home");
      }
    },
    [isMobile]
  );

  const navigateBack = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      const id = historyRef.current[historyIdxRef.current];
      setState((prev) => {
        const alreadyOpen = prev.openNoteIds.includes(id);
        const note = prev.notes.find((n) => n.id === id);
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: alreadyOpen ? prev.openNoteIds : [...prev.openNoteIds, id],
          mainView: note?.type === "canvas" ? "canvas" : "editor",
        };
      });
    }
  }, []);

  const navigateForward = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      const id = historyRef.current[historyIdxRef.current];
      setState((prev) => {
        const alreadyOpen = prev.openNoteIds.includes(id);
        const note = prev.notes.find((n) => n.id === id);
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: alreadyOpen ? prev.openNoteIds : [...prev.openNoteIds, id],
          mainView: note?.type === "canvas" ? "canvas" : "editor",
        };
      });
    }
  }, []);

  // Create new note
  const createNote = useCallback((type: NoteType = "markdown") => {
    const id = `note-${Date.now()}`;
    const now = new Date().toISOString().split("T")[0];
    const isDaily = type === "daily";
    const title = isDaily
      ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      : type === "drawing"
      ? "Untitled Drawing"
      : type === "kanban"
      ? "Untitled Board"
      : type === "canvas"
      ? "Untitled Canvas"
      : "Untitled";

    const defaultFolder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : type === "canvas" ? "canvases" : "root";
    const defaultKanbanContent = JSON.stringify({
      columns: [
        { id: "col-todo", label: "To Do", color: "#89b4fa", cards: [] },
        { id: "col-progress", label: "In Progress", color: "#f9e2af", cards: [] },
        { id: "col-done", label: "Done", color: "#a6e3a1", cards: [] },
      ],
    });
    const defaultCanvasContent = JSON.stringify({
      cards: [],
      connections: [],
      groups: [],
    });
    const newNote: Note = {
      id,
      title,
      content: type === "markdown" ? `# ${title}\n\nStart writing…` : type === "kanban" ? defaultKanbanContent : type === "canvas" ? defaultCanvasContent : "",
      tags: [],
      folder: defaultFolder,
      createdAt: now,
      updatedAt: now,
      starred: false,
      wordCount: 0,
      type,
    };

    let finalNote: Note = newNote;
    setState((prev) => {
      const folder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : type === "canvas" ? "canvases" : (prev.preferences.defaultNoteLocation || "root");
      finalNote = { ...newNote, folder };

      // Ensure the target folder exists so the note is visible in the sidebar
      const folderNames: Record<string, string> = { daily: "Daily Notes", drawings: "Drawings", canvases: "Canvases" };
      const folderExists = prev.folders.some((f) => f.id === folder);
      const updatedFolders = folderExists
        ? prev.folders
        : [...prev.folders, { id: folder, name: folderNames[folder] ?? folder, parentId: "root" }];

      return {
        ...prev,
        folders: updatedFolders,
        notes: [...prev.notes, finalNote],
        activeNoteId: id,
        openNoteIds: [...prev.openNoteIds, id],
        mainView: type === "canvas" ? "canvas" : "editor",
      };
    });
    pushNoteToFirestore(finalNote);

    // Save to disk in Electron
    if (isElectron() && vaultPath) {
      const fp = noteFilePath(vaultPath, finalNote);
      fsClient.writeFile(fp, noteToMarkdown({ ...finalNote, filePath: fp })).then(() => {
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === finalNote.id ? { ...n, filePath: fp } : n
          ),
        }));
      });
    }

    // Close mobile menu
    if (isMobile) {
      setMobileNewNoteMenuOpen(false);
      setMobileView("home");
    }
  }, [pushNoteToFirestore, isMobile, vaultPath]);

  // Create a daily note for a specific date (used by calendar widget)
  const createDailyNote = useCallback((date: Date) => {
    const id = `note-${Date.now()}`;
    const dateStr = date.toISOString().split("T")[0];
    const title = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    const newNote: Note = {
      id,
      title,
      content: `# ${title}\n\n## Morning Intentions\n\n## Notes\n\n## Reflection\n`,
      tags: ["daily"],
      folder: "daily",
      createdAt: dateStr,
      updatedAt: dateStr,
      starred: false,
      wordCount: 0,
      type: "daily",
    };
    setState((prev) => {
      const folderExists = prev.folders.some((f) => f.id === "daily");
      const updatedFolders = folderExists
        ? prev.folders
        : [...prev.folders, { id: "daily", name: "Daily Notes", parentId: "root" as string | null }];
      return {
        ...prev,
        folders: updatedFolders,
        notes: [...prev.notes, newNote],
        activeNoteId: id,
        openNoteIds: [...prev.openNoteIds, id],
        mainView: "editor",
      };
    });
    pushNoteToFirestore(newNote);
    if (isMobile) {
      setMobileRightPanelOpen(false);
      setMobileView("home");
    }
  }, [pushNoteToFirestore, isMobile]);

  // Create folder
  const createFolder = useCallback((name: string) => {
    const id = `folder-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      folders: [...prev.folders, { id, name, parentId: "root" }],
    }));
    // Create directory on disk in Electron
    if (isElectron() && vaultPath) {
      fsClient.mkdir(`${vaultPath}/${name}`).catch(() => { /* ignore */ });
    }
  }, [vaultPath]);

  // Delete folder — moves notes to root, removes folder from state
  const deleteFolder = useCallback((folderId: string) => {
    if (folderId === "root") return;
    let folderName: string | undefined;
    setState((prev) => {
      const folder = prev.folders.find((f) => f.id === folderId);
      folderName = folder?.name;
      return {
        ...prev,
        notes: prev.notes.map((n) => n.folder === folderId ? { ...n, folder: "root" } : n),
        folders: prev.folders.filter((f) => f.id !== folderId),
      };
    });
    // Remove directory on disk in Electron (outside setState)
    if (isElectron() && vaultPath && folderName) {
      fsClient.rmdir(`${vaultPath}/${folderName}`).catch(() => { /* ignore */ });
    }
  }, [vaultPath]);

  // Rename folder
  const renameFolder = useCallback((folderId: string, newName: string) => {
    if (folderId === "root" || !newName.trim()) return;
    let oldName: string | undefined;
    setState((prev) => {
      const folder = prev.folders.find((f) => f.id === folderId);
      oldName = folder?.name;
      return {
        ...prev,
        folders: prev.folders.map((f) => f.id === folderId ? { ...f, name: newName.trim() } : f),
      };
    });
    // Rename directory on disk in Electron (outside setState)
    if (isElectron() && vaultPath && oldName && oldName !== newName.trim()) {
      fsClient.renameDir(`${vaultPath}/${oldName}`, `${vaultPath}/${newName.trim()}`).catch(() => { /* ignore */ });
    }
  }, [vaultPath]);

  // Import markdown files (supports folder structure)
  const importNotes = useCallback((files: { title: string; content: string; folder?: string }[]) => {
    const now = new Date().toISOString().split("T")[0];
    // Collect unique folders from imported files
    const importedFolderNames = new Set<string>();
    files.forEach((f) => { if (f.folder && f.folder !== "root") importedFolderNames.add(f.folder); });

    const newFolders: Folder[] = [];
    setState((prev) => {
      const existingFolderNames = new Set(prev.folders.map((f) => f.name));
      for (const name of importedFolderNames) {
        if (!existingFolderNames.has(name)) {
          newFolders.push({ id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, parentId: "root" });
        }
      }
      return prev; // Don't update yet
    });

    // Build folder name→id lookup after creating new folders
    setState((prev) => {
      const allFolders = [...prev.folders, ...newFolders];
      const folderNameToId = new Map<string, string>();
      allFolders.forEach((f) => folderNameToId.set(f.name, f.id));

      const newNotes: Note[] = files.map((f, i) => ({
        id: `note-${Date.now()}-${i}`,
        title: f.title,
        content: f.content,
        tags: [],
        folder: f.folder ? (folderNameToId.get(f.folder) || "root") : "root",
        createdAt: now,
        updatedAt: now,
        starred: false,
        wordCount: f.content.split(/\s+/).filter(Boolean).length,
        type: "markdown" as NoteType,
      }));

      newNotes.forEach((n) => pushNoteToFirestore(n));
      // Write imported notes to disk in Electron
      if (isElectron() && vaultPath) {
        newNotes.forEach((n) => {
          const fp = noteFilePath(vaultPath, n);
          fsClient.writeFile(fp, noteToMarkdown({ ...n, filePath: fp }));
        });
      }

      return {
        ...prev,
        notes: [...prev.notes, ...newNotes],
        folders: allFolders,
      };
    });
  }, [pushNoteToFirestore, vaultPath]);

  // Move note to folder
  const moveNoteToFolder = useCallback((noteId: string, folderId: string) => {
    let movedNote: Note | null = null;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => {
        if (n.id !== noteId) return n;
        const updated = { ...n, folder: folderId };
        movedNote = updated;
        return updated;
      }),
    }));
    if (movedNote) {
      const note: Note = movedNote;
      pushNoteToFirestore(note);
      // Move file on disk in Electron
      if (isElectron() && vaultPath && note.filePath) {
        const newPath = noteFilePath(vaultPath, note);
        fsClient.renameFile(note.filePath, newPath).then(() => {
          setState((prev) => ({
            ...prev,
            notes: prev.notes.map((n) =>
              n.id === note.id ? { ...n, filePath: newPath } : n
            ),
          }));
        });
      }
    }
  }, [pushNoteToFirestore, vaultPath]);
  // Update note
  const updateNote = useCallback(
    (id: string, noteP: Partial<Note>) => {
      let updatedNote: Note | null = null;
      // Decide once whether this update should affect version history. We only
      // snapshot for actual *content* edits — never for tag/star/folder churn,
      // and never if the user has disabled history.
      const prevState = stateRef.current;
      const prevNote = prevState.notes.find((n) => n.id === id);
      const historyEnabled = prevState.preferences?.versionHistoryEnabled !== false;
      const contentChanged = typeof noteP.content === "string" && prevNote && noteP.content !== prevNote.content;
      const titleChanged = typeof noteP.title === "string" && prevNote && noteP.title !== prevNote.title;

      if (historyEnabled && prevNote && (contentChanged || titleChanged)) {
        const sessions = versionSessionRef.current;
        let session = sessions.get(id);
        if (!session) {
          // Open a new editing session; remember pre-edit state.
          session = {
            baseContent: prevNote.content,
            baseTitle: prevNote.title,
            baseUpdatedAt: prevNote.updatedAt,
            lastEditAt: Date.now(),
            idleTimer: null,
          };
          sessions.set(id, session);
        }
        session.lastEditAt = Date.now();
        if (session.idleTimer) clearTimeout(session.idleTimer);

        const commitSnapshot = () => {
          const sess = versionSessionRef.current.get(id);
          if (!sess) return;
          versionSessionRef.current.delete(id);
          // Only snapshot if there's a meaningful diff between base and current.
          setState((prev) => ({
            ...prev,
            notes: prev.notes.map((n) => {
              if (n.id !== id) return n;
              const meaningful = n.content !== sess.baseContent || n.title !== sess.baseTitle;
              if (!meaningful) return n;
              const history = n.versionHistory ?? [];
              // Skip if the latest snapshot already matches base content.
              if (history[0]?.content === sess.baseContent) return n;
              const snapshot = {
                id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                content: sess.baseContent,
                title: sess.baseTitle,
                savedAt: new Date().toISOString(),
                updatedAt: sess.baseUpdatedAt,
              };
              return {
                ...n,
                versionHistory: [snapshot, ...history].slice(0, MAX_NOTE_VERSIONS),
              };
            }),
          }));
        };

        // Commit if huge delta (≥ 400 chars change) — protects against losing
        // a big edit if the tab is closed before idle fires.
        const draftContent = (noteP.content as string | undefined) ?? prevNote.content;
        if (Math.abs(draftContent.length - session.baseContent.length) > 400) {
          // Schedule commit on next tick so it sees the updated state.
          setTimeout(commitSnapshot, 0);
        } else {
          // Otherwise commit when the user has been idle for 30 seconds.
          session.idleTimer = setTimeout(commitSnapshot, 30000);
        }
      }

      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          if (n.id !== id) return n;
          const nextContent = noteP.content ?? n.content;
          const result = {
            ...n,
            ...noteP,
            wordCount: countWords(nextContent),
            // Note: versionHistory is only updated by the commitSnapshot path
            // above; do NOT touch it here, otherwise we'd snapshot every keystroke.
          };
          updatedNote = result;
          return result;
        }),
      }));
      if (updatedNote) {
        pushNoteToFirestore(updatedNote);
        // Debounced save to disk in Electron (per-note timer)
        if (isElectron() && vaultPath) {
          const noteToSave: Note = updatedNote;
          const existing = vaultSaveTimerRef.current.get(noteToSave.id);
          if (existing) clearTimeout(existing);
          setDirtyNoteIds((prev) => new Set(prev).add(noteToSave.id));
          vaultSaveTimerRef.current.set(noteToSave.id, setTimeout(async () => {
            vaultSaveTimerRef.current.delete(noteToSave.id);
            setDirtyNoteIds((prev) => { const next = new Set(prev); next.delete(noteToSave.id); return next; });
            const fp = noteToSave.filePath || noteFilePath(vaultPath, noteToSave);
            await fsClient.writeFile(fp, noteToMarkdown({ ...noteToSave, filePath: fp }));
            if (!noteToSave.filePath) {
              setState((prev) => ({
                ...prev,
                notes: prev.notes.map((n) =>
                  n.id === noteToSave.id ? { ...n, filePath: fp } : n
                ),
              }));
            }
          }, 300));
        }
      }
    },
    [pushNoteToFirestore, vaultPath]
  );

  const restoreNoteVersion = useCallback((noteId: string, versionId: string) => {
    let restoredNote: Note | null = null;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => {
        if (n.id !== noteId) return n;

        const history = n.versionHistory ?? [];
        const targetVersion = history.find((v) => v.id === versionId);
        if (!targetVersion) return n;

        const now = new Date().toISOString();
        const restoredDate = now.split("T")[0];
        const snapshotBeforeRestore = {
          id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: n.content,
          title: n.title,
          savedAt: now,
          updatedAt: n.updatedAt,
        };

        const result = {
          ...n,
          content: targetVersion.content,
          updatedAt: restoredDate,
          wordCount: countWords(targetVersion.content),
          versionHistory: [snapshotBeforeRestore, ...history.filter((v) => v.id !== versionId)].slice(0, MAX_NOTE_VERSIONS),
        };
        restoredNote = result;
        return result;
      }),
    }));
    if (restoredNote) pushNoteToFirestore(restoredNote);
  }, [pushNoteToFirestore]);

  // Delete note (soft delete → moves to trash)
  const deleteNote = useCallback((id: string) => {
    let trashedNote: Note | null = null;
    setState((prev) => {
      const openRemaining = prev.openNoteIds.filter((oid) => oid !== id);
      const newActive =
        prev.activeNoteId === id
          ? openRemaining[openRemaining.length - 1] ?? null
          : prev.activeNoteId;
      return {
        ...prev,
        notes: prev.notes.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, trashed: true, trashedAt: new Date().toISOString() };
          trashedNote = updated;
          return updated;
        }),
        openNoteIds: openRemaining,
        activeNoteId: newActive,
      };
    });
    // Sync the soft-deleted note to Firestore & delete from disk (outside setState)
    if (trashedNote) {
      pushNoteToFirestore(trashedNote);
      if (isElectron() && (trashedNote as Note).filePath) {
        fsClient.deleteFile((trashedNote as Note).filePath!);
      }
    }
  }, [pushNoteToFirestore]);

  // Permanently delete note
  const permanentlyDeleteNote = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.notes.filter((n) => n.id !== id);
      const openRemaining = prev.openNoteIds.filter((oid) => oid !== id);
      const newActive =
        prev.activeNoteId === id
          ? openRemaining[openRemaining.length - 1] ?? null
          : prev.activeNoteId;
      return {
        ...prev,
        notes: remaining,
        openNoteIds: openRemaining,
        activeNoteId: newActive,
      };
    });
    deleteNoteFromFirestore(id);
  }, [deleteNoteFromFirestore]);

  // Restore note from trash
  const restoreNote = useCallback((id: string) => {
    let restoredNote: Note | null = null;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, trashed: false, trashedAt: undefined };
        restoredNote = updated;
        return updated;
      }),
    }));
    if (restoredNote) pushNoteToFirestore(restoredNote);
  }, [pushNoteToFirestore]);

  // Toggle note pin
  const togglePinNote = useCallback((id: string) => {
    let updatedNote: Note | null = null;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, pinned: !n.pinned };
        updatedNote = updated;
        return updated;
      }),
    }));
    if (updatedNote) pushNoteToFirestore(updatedNote);
  }, [pushNoteToFirestore]);

  // Rename note
  const renameNote = useCallback((id: string, title: string) => {
    let renamedNote: Note | null = null;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, title };
        renamedNote = updated;
        return updated;
      }),
    }));
    if (renamedNote) {
      const note: Note = renamedNote;
      pushNoteToFirestore(note);
      // Rename file on disk in Electron
      if (isElectron() && vaultPath && note.filePath) {
        const newPath = noteFilePath(vaultPath, note);
        fsClient.renameFile(note.filePath, newPath).then(() => {
          setState((prev) => ({
            ...prev,
            notes: prev.notes.map((n) =>
              n.id === note.id ? { ...n, filePath: newPath } : n
            ),
          }));
        });
      }
    }
  }, [pushNoteToFirestore, vaultPath]);



  // Handle auth
  const handleAuth = useCallback(
    (user: { email: string; displayName: string; uid: string }) => {
      patch({ user, authModalOpen: false, syncStatus: "syncing" });
    },
    [patch]
  );

  const handleSignOut = useCallback(async () => {
    try {
      // Destroy sync service
      if (syncServiceRef.current) {
        await syncServiceRef.current.destroy();
        syncServiceRef.current = null;
      }
      const { getFirebaseAuth } = await import("@/lib/firebase/config");
      const auth = getFirebaseAuth();
      if (auth) await auth.signOut();
    } catch { /* ignore */ }
    patch({ user: null, syncStatus: "offline", settingsOpen: false });
  }, [patch]);

  const performDeleteAllData = useCallback(async () => {
    const currentState = stateRef.current;

    try {
      if (currentState.user?.uid) {
        try {
          const { getFirebaseDb } = await import("@/lib/firebase/config");
          const { collection, deleteDoc, doc, getDocs } = await import("firebase/firestore");
          const db = getFirebaseDb();

          if (db) {
            const [notesSnap, foldersSnap] = await Promise.all([
              getDocs(collection(db, "users", currentState.user.uid, "notes")),
              getDocs(collection(db, "users", currentState.user.uid, "folders")),
            ]);

            await Promise.allSettled([
              ...notesSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
              ...foldersSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
              deleteDoc(doc(db, "users", currentState.user.uid, "settings", "preferences")),
            ]);
          }
        } catch { /* ignore */ }
      }

      if (isElectron()) {
        const notePaths = currentState.notes
          .map((note) => note.filePath)
          .filter((filePath): filePath is string => Boolean(filePath));

        if (notePaths.length > 0) {
          await Promise.allSettled(notePaths.map((filePath) => fsClient.deleteFile(filePath)));
        }

        if (vaultPath) {
          const folderPaths = currentState.folders
            .filter((folder) => folder.id !== "root")
            .map((folder) => `${vaultPath}/${folder.name}`)
            .sort((a, b) => b.split(/[\\/]/).length - a.split(/[\\/]/).length);

          if (folderPaths.length > 0) {
            await Promise.allSettled(folderPaths.map((dirPath) => fsClient.rmdir(dirPath)));
          }
        }

        await vaultClient.clearRecent();
        setRecentVaults([]);
      } else if (typeof window !== "undefined") {
        try {
          const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith("voltex-"));
          keysToRemove.forEach((key) => localStorage.removeItem(key));
          if (window.indexedDB) {
            window.indexedDB.deleteDatabase("obsidian-cloud-local");
          }
        } catch { /* ignore */ }

        setWebVaults([]);
        setActiveWebVaultId(null);
      }

      if (fileWatcherCleanupRef.current) {
        fileWatcherCleanupRef.current();
        fileWatcherCleanupRef.current = null;
      }

      historyRef.current = [];
      historyIdxRef.current = -1;
      setDirtyNoteIds(new Set());
      setSyncPromptVisible(false);
      setMobileDrawerOpen(false);
      setMobileNewNoteMenuOpen(false);
      setMobileRightPanelOpen(false);
      setMobileView("home");
      setVaultPath(null);
      setWelcomeModalOpen(isElectron());

      setState((prev) => ({
        ...prev,
        notes: [],
        folders: [{ id: "root", name: "Vault", parentId: null }],
        activeNoteId: null,
        openNoteIds: [],
        sidebarView: "files",
        mainView: "editor",
        searchQuery: "",
        settingsOpen: false,
        commandPaletteOpen: false,
        marketplaceOpen: false,
        syncedFolderIds: [],
        activeVaultId: undefined,
      }));
    } catch {
      alert("Failed to delete all data. Please try again.");
    }
  }, [vaultPath]);

  const handleDeleteAllData = useCallback(() => {
    askConfirm({
      title: "Delete everything?",
      description: (
        <>
          This permanently deletes <strong>all notes, folders, local vault data, and synced cloud data</strong>.
          The current vault will be closed and this action cannot be undone.
        </>
      ),
      confirmLabel: "Delete everything",
      tone: "danger",
      requireTypedConfirmation: "delete",
      onConfirm: async () => {
        setConfirmDialog(null);
        await performDeleteAllData();
      },
    });
  }, [askConfirm, performDeleteAllData]);

  // Theme change handler
  const handleThemeChange = useCallback((themeId: string) => {
    patch({ activeThemeId: themeId });
    // Sync to Firestore if logged in
    if (state.user?.uid) {
      (async () => {
        try {
          const { getFirebaseDb } = await import("@/lib/firebase/config");
          const { doc, setDoc } = await import("firebase/firestore");
          const db = getFirebaseDb();
          if (db) {
            await setDoc(
              doc(db, "users", state.user!.uid!, "settings", "preferences"),
              { activeThemeId: themeId, updatedAt: new Date().toISOString() },
              { merge: true }
            );
          }
        } catch { /* ignore */ }
      })();
    }
  }, [patch, state.user]);

  // Marketplace install/uninstall
  const handleMarketplaceInstall = useCallback((id: string) => {
    setState((prev) => {
      if (prev.installedPluginIds.includes(id)) return prev;
      const next: Partial<AppState> = {
        installedPluginIds: [...prev.installedPluginIds, id],
      };
      // Auto-activate Pomodoro timer on install
      if (id === "pomodoro" && !prev.pomodoro) {
        next.pomodoro = { running: false, mode: "work", secondsLeft: 25 * 60, sessions: 0, workMinutes: 25, breakMinutes: 5 };
      }
      // Auto-switch right panel to new tab when installing panel plugins
      if (id === "heatmap-calendar") next.rightPanelTab = "heatmap";
      if (id === "spaced-repetition") next.rightPanelTab = "flashcards";
      if (id === "mind-map") next.rightPanelTab = "mindmap";
      // Ensure right panel is open for panel plugins
      if (["heatmap-calendar", "spaced-repetition", "mind-map"].includes(id)) {
        next.rightPanelOpen = true;
      }
      return { ...prev, ...next };
    });
    // Open mobile right panel drawer for panel plugins
    if (isMobile && ["heatmap-calendar", "spaced-repetition", "mind-map"].includes(id)) {
      setMobileRightPanelOpen(true);
    }
    // Show toast notification
    const hint = PLUGIN_HINTS[id];
    if (hint) {
      setPluginToast({ message: hint, visible: true });
      setTimeout(() => setPluginToast((t) => t ? { ...t, visible: false } : null), 4000);
      setTimeout(() => setPluginToast(null), 4500);
    }
  }, [isMobile]);

  const handleMarketplaceUninstall = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      installedPluginIds: prev.installedPluginIds.filter((pid) => pid !== id),
    }));
  }, []);

  // Preferences change
  const handlePreferencesChange = useCallback((prefs: Partial<EditorPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }));
  }, []);

  // Apply font size from preferences
  useEffect(() => {
    document.documentElement.style.setProperty("--editor-font-size", `${state.preferences.fontSize}px`);
  }, [state.preferences.fontSize]);

  // Apply CSS snippets
  useEffect(() => {
    const snippetIds = state.enabledSnippetIds ?? [];
    // Remove old snippet styles
    document.querySelectorAll("style[data-snippet-id]").forEach((el) => {
      if (!snippetIds.includes(el.getAttribute("data-snippet-id") ?? "")) {
        el.remove();
      }
    });
    // Add new snippet styles
    snippetIds.forEach((id) => {
      if (document.querySelector(`style[data-snippet-id="${id}"]`)) return;
      const snippet = SAMPLE_SNIPPETS.find((s) => s.id === id);
      if (!snippet) return;
      const style = document.createElement("style");
      style.setAttribute("data-snippet-id", id);
      style.textContent = snippet.css;
      document.head.appendChild(style);
    });
  }, [state.enabledSnippetIds]);

  // Mobile navigation handler
  const handleMobileNavigate = useCallback((view: "home" | "search" | "graph" | "new" | "settings" | "panel") => {
    setMobileView(view);
    if (view === "home") {
      patch({ mainView: "editor", sidebarView: "files" });
    } else if (view === "search") {
      setMobileDrawerOpen(true);
      patch({ sidebarView: "search" });
    } else if (view === "graph") {
      patch({ mainView: "graph" });
    } else if (view === "settings") {
      patch({ settingsOpen: true });
    } else if (view === "panel") {
      setMobileRightPanelOpen(true);
    }
  }, [patch]);

  // Swipe to open drawer
  useSwipe(mainRef, {
    onSwipeRight: () => {
      if (isMobile && !mobileDrawerOpen) {
        setMobileDrawerOpen(true);
      }
    },
    onSwipeLeft: () => {
      if (isMobile && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    },
  });

  // ── Electron IPC event listeners (tray, menu, updater) ────────────────────
  useEffect(() => {
    if (!isElectron()) return;
    const cleanups: (() => void)[] = [];

    // Tray "New Note" (#3)
    cleanups.push(electronOn('tray:new-note', () => { createNoteRef.current(); }));

    // Menu events (#12)
    cleanups.push(electronOn('menu:open-settings', () => { patch({ settingsOpen: true }); }));
    cleanups.push(electronOn('menu:open-vault', async () => {
      const chosen = await vaultClient.open();
      if (chosen) await openVaultWithPrompt(chosen);
    }));
    cleanups.push(electronOn('menu:toggle-sidebar', () => {
      setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
    }));
    cleanups.push(electronOn('menu:toggle-right-panel', () => {
      setState((prev) => ({ ...prev, rightPanelOpen: !prev.rightPanelOpen }));
    }));

    // Auto-updater UI (#11)
    cleanups.push(updaterClient.onUpdateReady((version) => {
      setUpdateReady(version);
    }));

    return () => { cleanups.forEach((fn) => fn()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts — uses stateRef to avoid re-registering on every state change
  const createNoteRef = useRef(createNote);
  createNoteRef.current = createNote;
  const deleteNoteRef = useRef(deleteNote);
  deleteNoteRef.current = deleteNote;
  const pushNoteRef = useRef(pushNoteToFirestore);
  pushNoteRef.current = pushNoteToFirestore;
  const welcomeModalOpenRef = useRef(welcomeModalOpen);
  welcomeModalOpenRef.current = welcomeModalOpen;
  const workspaceSetupOpenRef = useRef(workspaceSetupOpen);
  workspaceSetupOpenRef.current = workspaceSetupOpen;
  const userInfoOpenRef = useRef(userInfoOpen);
  userInfoOpenRef.current = userInfoOpen;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const s = stateRef.current;
      if (ctrl && e.key === "p") {
        e.preventDefault();
        patch({ commandPaletteOpen: true });
      }
      if (ctrl && e.key === "n") {
        e.preventDefault();
        if (isMobile) {
          setMobileNewNoteMenuOpen(true);
        } else {
          createNoteRef.current();
        }
      }
      if (ctrl && e.key === "e") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          viewMode:
            prev.viewMode === "live"
              ? "editor"
              : prev.viewMode === "editor"
              ? "preview"
              : "live",
        }));
      }
      if (ctrl && e.key === "g") {
        e.preventDefault();
        patch({ mainView: "graph", sidebarView: "graph" });
        if (isMobile) setMobileView("graph");
      }
      if (ctrl && e.key === "k") {
        e.preventDefault();
        patch({ mainView: "canvas", sidebarView: "canvas" });
      }
      if (ctrl && e.key === "f") {
        e.preventDefault();
        patch({ sidebarView: "search" });
        if (isMobile) {
          setMobileDrawerOpen(true);
        }
      }
      if (ctrl && e.key === "b") {
        e.preventDefault();
        if (!isMobile) {
          setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
        }
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        const active = s.notes.find((n) => n.id === s.activeNoteId);
        if (active) pushNoteRef.current(active);
      }
      if (ctrl && e.key === "d") {
        e.preventDefault();
        if (s.activeNoteId) {
          const id = s.activeNoteId;
          const noteTitle = s.notes.find((n) => n.id === id)?.title ?? "this note";
          askConfirm({
            title: "Move note to trash?",
            description: <>You can restore <strong>&quot;{noteTitle}&quot;</strong> from the Trash view.</>,
            confirmLabel: "Move to trash",
            tone: "warning",
            onConfirm: () => {
              deleteNoteRef.current(id);
              setConfirmDialog(null);
            },
          });
        }
      }
      if (ctrl && e.key === "a") {
        const activeEl = document.activeElement;
        const isInEditor = activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement || (activeEl as HTMLElement)?.isContentEditable;
        if (!isInEditor) {
          e.preventDefault();
          sidebarSelectAllRef.current?.selectAll();
        }
      }
      if (ctrl && e.key === "l") {
        e.preventDefault();
      }
      if (e.key === "Escape") {
        if (welcomeModalOpenRef.current) {
          setWelcomeModalOpen(false);
          try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
        }
        if (s.commandPaletteOpen) patch({ commandPaletteOpen: false });
        if (s.settingsOpen) patch({ settingsOpen: false });
        if (s.authModalOpen) patch({ authModalOpen: false });
        if (userInfoOpenRef.current) setUserInfoOpen(false);
        if (isMobile) {
          setMobileDrawerOpen(false);
          setMobileNewNoteMenuOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [patch, isMobile]);

  const activeNote = state.notes.find((n) => n.id === state.activeNoteId);

  // Show a minimal loading shell until first-run hydration is complete OR
  // an onboarding dialog (welcome / workspace setup) is showing. This prevents
  // any flash of sample notes / wrong workspace state on refresh.
  if (!appReady && !welcomeModalOpen && !workspaceSetupOpen) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen w-screen gap-3"
        style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-muted-text)" }}
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-obsidian-accent)", borderTopColor: "transparent" }}
        />
        <p className="text-xs tracking-wide uppercase opacity-70">Loading vault</p>
      </div>
    );
  }

  return (
    <div
      ref={mainRef}
      className="obsidian-app-root workbench-shell flex flex-col h-screen overflow-hidden"
      style={{
        background: "var(--color-obsidian-bg)",
        backgroundImage:
          "radial-gradient(1200px 600px at 8% -10%, color-mix(in srgb, var(--color-obsidian-accent) 14%, transparent), transparent 60%), radial-gradient(900px 500px at 110% 110%, color-mix(in srgb, var(--color-obsidian-accent) 8%, transparent), transparent 55%)",
      }}
    >
      {/* Auto-updater banner */}
      {updateReady && (
        <div
          className="flex items-center justify-center gap-3 py-1.5 px-4 text-xs font-medium shrink-0"
          style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
        >
          <span>Voltex Notes v{updateReady} is ready</span>
          <button
            className="px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onClick={() => updaterClient.installUpdate()}
          >
            Restart to install
          </button>
          <button
            className="opacity-60 hover:opacity-100"
            onClick={() => setUpdateReady(null)}
          >
            <X size={12} />
          </button>
        </div>
      )}
      {/* Desktop Title bar */}
      <div className="hide-mobile">
        <TitleBar
          state={state}
          onStateChange={patch}
          onOpenCommandPalette={() => patch({ commandPaletteOpen: true })}
          onOpenSettings={() => patch({ settingsOpen: true })}
          onOpenAuth={() => patch({ authModalOpen: true })}
          onOpenUserInfo={() => setUserInfoOpen(true)}
          onOpenWelcome={() => setWelcomeModalOpen(true)}
          onOpenVault={isElectron() ? async () => {
            const chosen = await vaultClient.open();
            if (chosen) await openVaultWithPrompt(chosen);
          } : undefined}
          vaultPath={vaultPath ?? undefined}
          onNavigateBack={navigateBack}
          onNavigateForward={navigateForward}
          canGoBack={historyIdxRef.current > 0}
          canGoForward={historyIdxRef.current < historyRef.current.length - 1}
        />
      </div>

      {/* Mobile Header */}
      <MobileHeader
        title={activeNote?.title ?? "Voltex Notes"}
        onMenuOpen={() => setMobileDrawerOpen(true)}
        onBack={historyIdxRef.current > 0 ? navigateBack : undefined}
        showBack={historyIdxRef.current > 0}
        syncStatus={state.syncStatus}
        rightActions={
          <button
            onClick={() => patch({ commandPaletteOpen: true })}
            className="p-2 tap-target"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-obsidian-muted-text)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        }
      />

      {/* Main 3-column layout (desktop) / single column (mobile) */}
      <div className={`flex flex-1 overflow-hidden ${isMobile ? "" : "px-2.5 pb-2.5 pt-1 gap-2.5"}`}>
        {/* Desktop Sidebar */}
        {!isMobile && !state.sidebarCollapsed && (
          <div
            className="shrink-0 hide-mobile workbench-pane"
            style={{
              width: isSmallDesktop ? 220 : 264,
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              borderRadius: 14,
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.55), 0 2px 6px -2px rgba(0,0,0,0.35)",
              overflow: "hidden",
              position: "relative",
              zIndex: 20,
            }}
          >
            <Sidebar
              state={state}
              onStateChange={patch}
              onNewNote={createNote}
              onDeleteNote={deleteNote}
              onRenameNote={renameNote}
              onNoteOpen={openNote}
              onCreateFolder={createFolder}
              onDeleteFolder={deleteFolder}
              onRenameFolder={renameFolder}
              onMoveNoteToFolder={moveNoteToFolder}
              onPermanentlyDelete={permanentlyDeleteNote}
              onRestoreNote={restoreNote}
              onTogglePin={togglePinNote}
              vaultPath={vaultPath ?? undefined}
              selectAllRef={sidebarSelectAllRef}
              webVaults={!isElectron() ? webVaults : undefined}
              activeWebVaultId={!isElectron() ? activeWebVaultId : undefined}
              onCreateWebVault={!isElectron() ? createWebVault : undefined}
              onSwitchWebVault={!isElectron() ? switchWebVault : undefined}
              onOpenVault={isElectron() ? async () => {
                const chosen = await vaultClient.open();
                if (chosen) await openVaultWithPrompt(chosen);
              } : undefined}
              onCreateVault={isElectron() ? () => {
                setVaultNameInput({ parentPath: "" });
              } : undefined}
              recentVaults={isElectron() ? recentVaults : undefined}
              onOpenRecent={isElectron() ? async (recentPath) => {
                await openVaultWithPrompt(recentPath);
              } : undefined}
              onConfirm={askConfirm}
            />
          </div>
        )}

        {/* Center — editor or graph */}
        <div
          ref={editorAreaRef}
          className="flex-1 overflow-hidden relative workbench-stage"
          style={{
            paddingBottom: isMobile ? 80 : 0,
            minWidth: isMobile ? undefined : 400,
            background: isMobile ? undefined : "var(--color-obsidian-bg)",
            border: isMobile ? undefined : "1px solid var(--color-obsidian-border)",
            borderRadius: isMobile ? 0 : 14,
            boxShadow: isMobile
              ? undefined
              : "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -20px rgba(0,0,0,0.6), 0 4px 14px -4px rgba(0,0,0,0.4)",
          }}
        >
          {state.mainView === "editor" ? (
            <Editor
              state={state}
              onStateChange={patch}
              onNoteChange={updateNote}
              onNoteClick={openNote}
              onNewNote={createNote}
              isMobile={isMobile}
              dirtyNoteIds={dirtyNoteIds}
            />
          ) : state.mainView === "graph" ? (
            <GraphView
              notes={state.notes}
              activeNoteId={state.activeNoteId}
              onNoteClick={(id) => openNote(id)}
              isMobile={isMobile}
            />
          ) : state.mainView === "canvas" ? (() => {
            const canvasNote = state.notes.find((n) => n.id === state.activeNoteId && n.type === "canvas");
            if (!canvasNote) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  <p className="text-sm">Select or create a canvas to get started</p>
                  <button
                    onClick={() => createNote("canvas")}
                    className="px-4 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                  >
                    New Canvas
                  </button>
                </div>
              );
            }
            return (
              <CanvasView
                note={canvasNote}
                allNotes={state.notes}
                onChange={(content) => {
                  setState((prev) => ({
                    ...prev,
                    notes: prev.notes.map((n) =>
                      n.id === canvasNote.id
                        ? { ...n, content, updatedAt: new Date().toISOString() }
                        : n
                    ),
                  }));
                  pushNoteToFirestore({ ...canvasNote, content, updatedAt: new Date().toISOString() });
                }}
                onNoteClick={(id) => openNote(id)}
              />
            );
          })() : (
            <GraphView
              notes={state.notes}
              activeNoteId={state.activeNoteId}
              onNoteClick={(id) => openNote(id)}
              isMobile={isMobile}
            />
          )}

          {/* Pet companion — roams the editor area when enabled in settings. */}
          {!isMobile && state.petEnabled && (
            <PetCompanion
              type={state.petType ?? "cat"}
              containerRef={editorAreaRef}
              enabled
              zIndex={20}
            />
          )}
        </div>

        {/* Desktop Right panel */}
        {!isMobile && state.rightPanelOpen && (
          <div
            className="shrink-0 overflow-hidden hide-mobile workbench-pane"
            style={{
              width: isSmallDesktop ? 200 : 240,
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              borderRadius: 14,
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.55), 0 2px 6px -2px rgba(0,0,0,0.35)",
            }}
          >
            <RightPanel
              state={state}
              onStateChange={patch}
              onNoteClick={openNote}
              onRestoreVersion={restoreNoteVersion}
              onNewDailyNote={createDailyNote}
            />
          </div>
        )}
      </div>

      {/* Mobile Drawer (sidebar) */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Voltex Notes"
      >
        <Sidebar
          state={state}
          onStateChange={patch}
          onNewNote={(type) => { createNote(type); setMobileDrawerOpen(false); }}
          onDeleteNote={deleteNote}
          onRenameNote={renameNote}
          onNoteOpen={(id) => { openNote(id); setMobileDrawerOpen(false); }}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onRenameFolder={renameFolder}
          onMoveNoteToFolder={moveNoteToFolder}
          isMobile={true}
          onPermanentlyDelete={permanentlyDeleteNote}
          onRestoreNote={restoreNote}
          onTogglePin={togglePinNote}
          vaultPath={vaultPath ?? undefined}
          selectAllRef={sidebarSelectAllRef}
          webVaults={!isElectron() ? webVaults : undefined}
          activeWebVaultId={!isElectron() ? activeWebVaultId : undefined}
          onCreateWebVault={!isElectron() ? createWebVault : undefined}
          onSwitchWebVault={!isElectron() ? switchWebVault : undefined}
          onOpenVault={isElectron() ? async () => {
            const chosen = await vaultClient.open();
            if (chosen) { setMobileDrawerOpen(false); await openVaultWithPrompt(chosen); }
          } : undefined}
          onCreateVault={isElectron() ? () => {
            setMobileDrawerOpen(false);
            setVaultNameInput({ parentPath: "" });
          } : undefined}
          onConfirm={askConfirm}
        />
      </MobileDrawer>

      {/* Mobile Right Panel Drawer */}
      {isMobile && (
        <MobileDrawer
          isOpen={mobileRightPanelOpen}
          onClose={() => setMobileRightPanelOpen(false)}
          title="Panel"
          side="right"
        >
          <RightPanel
            state={state}
            onStateChange={patch}
            onNoteClick={(id) => { openNote(id); setMobileRightPanelOpen(false); }}
            onRestoreVersion={restoreNoteVersion}
            onNewDailyNote={createDailyNote}
          />
        </MobileDrawer>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={state.mainView === "graph" ? "graph" : mobileView}
        onNavigate={handleMobileNavigate}
        onNewNoteMenu={() => setMobileNewNoteMenuOpen(true)}
      />

      {/* Mobile-only "more on desktop" hint */}
      {isMobile && <MobileDesktopHint />}

      {/* Mobile New Note Menu */}
      <NewNoteMenu
        isOpen={mobileNewNoteMenuOpen}
        onClose={() => setMobileNewNoteMenuOpen(false)}
        onSelect={createNote}
        installedPluginIds={state.installedPluginIds}
      />

      {/* Overlays */}
      {state.commandPaletteOpen && (
        <CommandPalette
          notes={state.notes}
          onClose={() => patch({ commandPaletteOpen: false })}
          onNoteOpen={openNote}
          onNewNote={() => isMobile ? setMobileNewNoteMenuOpen(true) : createNote()}
          onOpenSettings={() => patch({ settingsOpen: true, commandPaletteOpen: false })}
          onOpenGraph={() => patch({ mainView: "graph", commandPaletteOpen: false })}
          onViewMode={(mode) => patch({ viewMode: mode, commandPaletteOpen: false })}
          onSidebarView={(view) => patch({ sidebarView: view, sidebarCollapsed: false, commandPaletteOpen: false })}
        />
      )}

      {userInfoOpen && (
        <UserInfoPanel
          user={state.user}
          notesCount={state.notes.filter((n) => !n.trashed).length}
          syncStatus={state.syncStatus}
          onClose={() => setUserInfoOpen(false)}
          onSignIn={() => {
            setUserInfoOpen(false);
            patch({ authModalOpen: true });
          }}
          onOpenSettings={() => {
            setUserInfoOpen(false);
            patch({ settingsOpen: true });
          }}
        />
      )}

      {state.authModalOpen && (
        <AuthModal
          onClose={() => patch({ authModalOpen: false })}
          onAuth={handleAuth}
        />
      )}

      {state.settingsOpen && (
        <SettingsModal
          state={state}
          onClose={() => patch({ settingsOpen: false })}
          onInstall={handleMarketplaceInstall}
          onUninstall={handleMarketplaceUninstall}
          onSignOut={handleSignOut}
          onDeleteAllData={handleDeleteAllData}
          onSyncStatusChange={(s) => {
            patch({ syncStatus: s });
            if (s === "syncing" && syncServiceRef.current) {
              syncServiceRef.current.syncAll(state.notes).then(() => {
                syncServiceRef.current?.pushFolders(state.folders);
                const syncedIds = state.folders.filter(f => f.id !== "root").map(f => f.id);
                patch({ syncedFolderIds: syncedIds });
              });
            }
          }}
          onThemeChange={handleThemeChange}
          onPreferencesChange={handlePreferencesChange}
          onOpenMarketplace={() => patch({ marketplaceOpen: true, settingsOpen: false })}
          onImportNotes={importNotes}
          onSwitchVault={isElectron() ? async () => {
            const chosen = await vaultClient.open();
            if (chosen) {
              patch({ settingsOpen: false });
              await openVaultWithPrompt(chosen);
            }
          } : undefined}
          onCreateVault={isElectron() ? async () => {
            patch({ settingsOpen: false });
            setVaultNameInput({ parentPath: "" });
          } : undefined}
          onAppStateChange={(p) => patch(p)}
        />
      )}

      {state.marketplaceOpen && (
        <MarketplacePanel
          installedIds={state.installedPluginIds}
          onInstall={handleMarketplaceInstall}
          onUninstall={handleMarketplaceUninstall}
          onClose={() => patch({ marketplaceOpen: false })}
          enabledSnippetIds={state.enabledSnippetIds}
          onToggleSnippet={(id) => {
            const current = state.enabledSnippetIds ?? [];
            const next = current.includes(id)
              ? current.filter((s) => s !== id)
              : [...current, id];
            patch({ enabledSnippetIds: next });
          }}
        />
      )}

      {/* Welcome Modal */}
      {welcomeModalOpen && (
        <WelcomeModal
          user={state.user}
          onDismiss={() => {
            try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
            setWelcomeModalOpen(false);
            const configured = localStorage.getItem("voltex-workspace-configured");
            if (!configured) {
              setWorkspaceSetupOpen(true);
            } else {
              setAppReady(true);
            }
          }}
          onSignIn={() => {
            try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
            setWelcomeModalOpen(false);
            patch({ authModalOpen: true });
            const configured = localStorage.getItem("voltex-workspace-configured");
            if (!configured) {
              setWorkspaceSetupOpen(true);
            } else {
              setAppReady(true);
            }
          }}
          onOpenVault={isElectron() ? async () => {
            const chosen = await vaultClient.open();
            if (chosen) {
              setWelcomeModalOpen(false);
              await openVaultWithPrompt(chosen);
            }
          } : undefined}
          onCreateVault={isElectron() ? async () => {
            const parentResult = await vaultClient.open();
            if (!parentResult) return;
            setVaultNameInput({ parentPath: parentResult });
          } : undefined}
          recentVaults={isElectron() ? recentVaults : undefined}
          onOpenRecent={isElectron() ? async (vaultDir: string) => {
            setWelcomeModalOpen(false);
            await openVaultWithPrompt(vaultDir);
          } : undefined}
        />
      )}

      {/* Vault Name Input Dialog (Electron) */}
      {vaultNameInput && (
        <VaultNameDialog
          onSubmit={async (name) => {
            let parentPath = vaultNameInput.parentPath;
            // If no parent path provided, ask user to pick a location
            if (!parentPath) {
              const chosen = await vaultClient.open();
              if (!chosen) return;
              parentPath = chosen;
            }
            const newVault = await vaultClient.create(name, parentPath);
            setVaultNameInput(null);
            setWelcomeModalOpen(false);
            await openVaultWithPrompt(newVault);
          }}
          onCancel={() => setVaultNameInput(null)}
        />
      )}

      {/* Workspace Setup Dialog */}
      {workspaceSetupOpen && (
        <WorkspaceSetupDialog
          onSelect={(choice) => {
            try { localStorage.setItem("voltex-workspace-configured", choice); } catch { /* ignore */ }
            // Persist to cloud if signed in
            const uid = state.user?.uid;
            if (uid) {
              (async () => {
                try {
                  const { getFirebaseDb } = await import("@/lib/firebase/config");
                  const db = getFirebaseDb();
                  if (!db) return;
                  const { doc, setDoc } = await import("firebase/firestore");
                  await setDoc(doc(db, "users", uid, "settings", "preferences"), { workspaceChoice: choice }, { merge: true });
                } catch { /* ignore */ }
              })();
            }
            setWorkspaceSetupOpen(false);
            const guestVid = ensureGuestVault();
            if (choice === "empty") {
              const blankNote: Note = {
                id: `note-${Date.now()}`,
                title: "Untitled",
                content: "# Untitled\n\nStart writing…",
                tags: [],
                folder: "root",
                createdAt: new Date().toISOString().split("T")[0],
                updatedAt: new Date().toISOString().split("T")[0],
                starred: false,
                wordCount: 0,
                type: "markdown",
              };
              setState((prev) => ({
                ...prev,
                notes: [blankNote],
                folders: [{ id: "root", name: "Vault", parentId: null }],
                activeNoteId: blankNote.id,
                openNoteIds: [blankNote.id],
                activeVaultId: guestVid,
              }));
            } else {
              // Seed sample/onboarding notes (only on explicit "docs" choice).
              setState((prev) => ({
                ...prev,
                notes: SAMPLE_NOTES,
                folders: SAMPLE_FOLDERS,
                activeNoteId: SAMPLE_NOTES[0].id,
                openNoteIds: [SAMPLE_NOTES[0].id, SAMPLE_NOTES[1].id, SAMPLE_NOTES[2].id].filter(Boolean),
                activeVaultId: guestVid,
              }));
            }
            setAppReady(true);
          }}
        />
      )}

      {/* Confirmation dialog (replaces native confirm) */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        requireTypedConfirmation={confirmDialog?.requireTypedConfirmation}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Plugin install toast notification */}
      {pluginToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3 transition-all duration-500"
          style={{
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-accent)",
            boxShadow: "0 8px 32px rgba(124,106,247,0.3)",
            opacity: pluginToast.visible ? 1 : 0,
            transform: `translateX(-50%) translateY(${pluginToast.visible ? "0" : "20px"})`,
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--color-obsidian-accent)", fontSize: "18px", lineHeight: 1, marginTop: "1px" }}>✓</span>
          <p className="text-sm leading-snug flex-1" style={{ color: "var(--color-obsidian-text)" }}>
            {pluginToast.message}
          </p>
          <button
            onClick={() => setPluginToast(null)}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Vault sync prompt */}
      {syncPromptVisible && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(6,7,12,0.6)", backdropFilter: "blur(6px)", animation: "fadeIn 0.18s ease" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-prompt-title"
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
              animation: "scaleIn 0.22s cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <div className="p-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "color-mix(in srgb, var(--color-obsidian-accent) 14%, transparent)" }}
              >
                <Cloud size={24} style={{ color: "var(--color-obsidian-accent)" }} />
              </div>
              <h3
                id="sync-prompt-title"
                className="text-xl font-semibold mb-1"
                style={{ color: "var(--color-obsidian-text)" }}
              >
                Sync this vault to the cloud?
              </h3>
              <p className="text-sm mb-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
                <strong style={{ color: "var(--color-obsidian-text)" }}>{vaultPath ? vaultPath.replace(/\\/g, "/").split("/").pop() : "Untitled vault"}</strong>
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Sync keeps your notes encrypted and available across every device. You can change this anytime in Settings → Cloud Sync.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: "transparent",
                    color: "var(--color-obsidian-muted-text)",
                    border: "1px solid var(--color-obsidian-border)",
                  }}
                  onClick={() => setSyncPromptVisible(false)}
                >
                  Keep local only
                </button>
                <button
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                  autoFocus
                  onClick={async () => {
                    setSyncPromptVisible(false);
                    if (syncServiceRef.current) {
                      patch({ syncStatus: "syncing" });
                      await syncServiceRef.current.syncAll(state.notes);
                      await syncServiceRef.current.pushFolders(state.folders);
                      const syncedIds = state.folders.filter(f => f.id !== "root").map(f => f.id);
                      patch({
                        syncedFolderIds: syncedIds,
                        folders: state.folders.map(f => f.id === "root" ? f : { ...f, synced: true }),
                      });
                    }
                  }}
                >
                  Sync to cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WelcomeModal (private sub-component) ─────────────────────────────────────

const WELCOME_FEATURES = [
  { icon: FileEdit, title: "Live Markdown", desc: "Inline editor with split preview and syntax highlighting." },
  { icon: Link2, title: "Wikilinks & Graph", desc: "Connect [[notes]] and watch your knowledge form a map." },
  { icon: Cloud, title: "Real-time Sync", desc: "Encrypted, cross-device sync — fully offline-first." },
  { icon: Package, title: "Plugins & Themes", desc: "Excalidraw, Kanban, daily notes, 9+ themes — your call." },
  { icon: SearchIcon, title: "Search Everything", desc: "Tags, bookmarks, full-text search across the vault." },
  { icon: Command, title: "Keyboard-first", desc: "Ctrl+P palette, Ctrl+N new, and the rest of muscle memory." },
] as const;

interface WelcomeModalProps {
  onDismiss: () => void;
  onSignIn: () => void;
  user?: AppState["user"];
  onOpenVault?: () => void;
  onCreateVault?: () => void;
  recentVaults?: Array<{ path: string; name: string; lastOpened: number }>;
  onOpenRecent?: (vaultPath: string) => void;
}
function WelcomeModal({ onDismiss, onSignIn, user, onOpenVault, onCreateVault, recentVaults, onOpenRecent }: WelcomeModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);
  const isElectronCtx = !!(onOpenVault || onCreateVault);

  // Focus management + escape (Escape is already wired globally, but we still need focus)
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setTimeout(() => dismissBtnRef.current?.focus(), 0);
    return () => { previouslyFocused?.focus?.(); };
  }, []);

  const initial = (user?.displayName?.trim()?.charAt(0) || user?.email?.trim()?.charAt(0) || "?").toUpperCase();
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
      style={{ backdropFilter: "blur(10px)", background: "rgba(6,7,12,0.72)", animation: "fadeIn 0.2s ease" }}
      onClick={onDismiss}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="welcome-modal-card relative w-full max-w-6xl rounded-[20px] overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.08)",
          animation: "scaleIn 0.28s cubic-bezier(.2,.8,.2,1)",
          maxHeight: "calc(100dvh - 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={dismissBtnRef}
          onClick={onDismiss}
          className="absolute top-3 right-3 p-2 rounded-lg transition-colors z-30 hover:bg-white/10"
          style={{ color: "rgba(244,240,230,0.65)" }}
          aria-label="Close welcome dialog"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]" style={{ maxHeight: "calc(100dvh - 26px)", overflowY: "auto" }}>
          {/* ── Left: Editorial hero with VoltexStage ── */}
          <div
            className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 min-h-[420px] lg:min-h-[640px]"
            style={{
              background: "rgb(8 8 14)",
              borderRight: "1px solid var(--color-obsidian-border)",
            }}
          >
            {/* Brand row */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: "rgba(244,240,230,0.55)" }}
                >
                  voltex / notes
                </span>
                <span
                  className="font-mono text-[10px] tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
                  style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}
                >
                  v1.3
                </span>
              </div>
              <span
                className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(244,240,230,0.4)" }}
              >
                est. 2025 · open-source
              </span>
            </div>

            {/* Headline */}
            <div className="relative z-10 mt-8 lg:mt-12">
              <h1
                id={titleId}
                className="text-[40px] sm:text-[52px] lg:text-[64px] leading-[0.95] tracking-tight"
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  color: "#f4f0e6",
                  fontWeight: 400,
                }}
              >
                Your second
                <br />
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 500,
                    background: "linear-gradient(120deg, #a78bfa 0%, #22d3ee 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  brain.
                </em>
              </h1>
              <p
                className="mt-4 max-w-md text-sm sm:text-base leading-relaxed"
                style={{ color: "rgba(244,240,230,0.65)", fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Markdown, wikilinks, real-time sync, plugins. Local files you actually own — with the polish you wish Obsidian had.
              </p>
            </div>

            {/* Stage */}
            <div className="relative z-0 my-6 lg:my-8 h-[260px] sm:h-[320px] lg:h-[360px]">
              <VoltexStage active />
            </div>

            {/* Footer line */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#a78bfa", boxShadow: "0 0 12px #a78bfa" }} aria-hidden="true" />
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: "rgba(244,240,230,0.6)" }}
                >
                  ready when you are
                </span>
              </div>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(244,240,230,0.35)" }}
              >
                {isElectronCtx ? "desktop" : "web"} edition
              </span>
            </div>
          </div>

          {/* ── Right: Action panel ── */}
          <div
            className="flex flex-col p-6 sm:p-8 lg:p-10 gap-6"
            style={{ background: "var(--color-obsidian-surface)" }}
          >
            {/* Vault section (Electron) */}
            {isElectronCtx && (
              <section aria-labelledby="vault-heading">
                <div className="flex items-center justify-between mb-3">
                  <h2
                    id="vault-heading"
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: "var(--color-obsidian-muted-text)" }}
                  >
                    01 — Vault
                  </h2>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--color-obsidian-muted-text)" }}
                  >
                    local files
                  </span>
                </div>

                {onOpenVault && (
                  <button
                    onClick={onOpenVault}
                    className="welcome-action-primary w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold mb-2 text-left transition-all"
                    style={{
                      background: "linear-gradient(135deg, #a78bfa 0%, #7c6af7 100%)",
                      color: "#fff",
                      boxShadow: "0 8px 24px rgba(124,106,247,0.35)",
                    }}
                  >
                    <FolderOpen size={18} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="leading-tight">Open Folder…</div>
                      <div className="text-[11px] font-normal opacity-85 mt-0.5">Use any existing markdown folder</div>
                    </div>
                  </button>
                )}
                {onCreateVault && (
                  <button
                    onClick={onCreateVault}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-colors hover:bg-white/[0.04]"
                    style={{ border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                  >
                    <HardDrive size={18} style={{ color: "var(--color-obsidian-accent)" }} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="leading-tight">Create New Vault…</div>
                      <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
                        Start fresh in a new folder
                      </div>
                    </div>
                  </button>
                )}

                {recentVaults && recentVaults.length > 0 && (
                  <div className="mt-4">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-2 px-1"
                      style={{ color: "var(--color-obsidian-muted-text)" }}
                    >
                      Recent
                    </p>
                    <div className="flex flex-col gap-0.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                      {recentVaults.map((v) => (
                        <button
                          key={v.path}
                          onClick={() => onOpenRecent?.(v.path)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-white/[0.04]"
                          style={{ color: "var(--color-obsidian-text)" }}
                          title={v.path}
                        >
                          <FolderOpen size={12} style={{ color: "var(--color-obsidian-muted-text)" }} className="shrink-0" />
                          <span className="truncate">{v.name}</span>
                          <span
                            className="ml-auto shrink-0 text-[10px] tabular-nums"
                            style={{ color: "var(--color-obsidian-muted-text)" }}
                          >
                            {new Date(v.lastOpened).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Account section */}
            <section aria-labelledby="account-heading">
              <div className="flex items-center justify-between mb-3">
                <h2
                  id="account-heading"
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  {isElectronCtx ? "02 — Cloud sync" : "01 — Cloud sync"}
                </h2>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  optional
                </span>
              </div>

              {user ? (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: "var(--color-obsidian-bg)",
                    border: "1px solid var(--color-obsidian-border)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                    style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-obsidian-text)" }}>
                      {user.displayName || user.email || "Signed in"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#a6e3a1" }} aria-hidden="true" />
                      <p className="text-[11px] truncate" style={{ color: "#a6e3a1" }}>
                        Signed in & syncing
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-obsidian-text)" }}>
                    Sync across devices in real-time. End-to-end encrypted, offline-first.
                  </p>
                  <button
                    onClick={onSignIn}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{
                      background: "var(--color-obsidian-text)",
                      color: "var(--color-obsidian-bg)",
                    }}
                  >
                    Sign in to sync
                  </button>
                </>
              )}
            </section>

            {/* Features grid */}
            <section aria-labelledby="features-heading" className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2
                  id="features-heading"
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  {isElectronCtx ? "03 — Inside" : "02 — Inside"}
                </h2>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  6 of {WELCOME_FEATURES.length}+
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {WELCOME_FEATURES.map((f) => (
                  <li
                    key={f.title}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg"
                    style={{
                      background: "var(--color-obsidian-bg)",
                      border: "1px solid var(--color-obsidian-border)",
                    }}
                  >
                    <div
                      className="shrink-0 mt-0.5 p-1.5 rounded-md"
                      style={{ background: "rgba(167,139,250,0.12)" }}
                      aria-hidden="true"
                    >
                      <f.icon size={13} style={{ color: "#a78bfa" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight" style={{ color: "var(--color-obsidian-text)" }}>
                        {f.title}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--color-obsidian-muted-text)" }}>
                        {f.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Primary CTA */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={onDismiss}
                className="w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "var(--color-obsidian-accent)",
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(59,142,245,0.28)",
                }}
              >
                {isElectronCtx ? "Continue without a vault" : "Open Voltex Notes →"}
              </button>
              <p className="text-center text-[11px]" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Press <kbd
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                >Esc</kbd> to dismiss · always available from the title bar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WorkspaceSetupDialog (private sub-component) ─────────────────────────────

function WorkspaceSetupDialog({ onSelect }: { onSelect: (choice: "docs" | "empty") => void }) {
  const [selected, setSelected] = useState<"docs" | "empty">("docs");
  const titleId = useId();
  const descId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setTimeout(() => continueRef.current?.focus(), 0);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        onSelect(selected);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [selected, onSelect]);

  const options: Array<{
    id: "docs" | "empty";
    label: string;
    desc: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "docs",
      label: "Start with Documentation",
      desc: "Pre-loaded guides, markdown reference, wikilinks tutorial. Best if you're new to vault-style notes.",
      icon: BookOpen,
      badge: "Recommended",
    },
    {
      id: "empty",
      label: "Start Empty",
      desc: "Clean slate with a single root folder. Best if you're importing your own notes.",
      icon: FolderOpen,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(6,7,12,0.7)", backdropFilter: "blur(8px)", animation: "fadeIn 0.18s ease" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-2xl rounded-[20px] overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          animation: "scaleIn 0.22s cubic-bezier(.2,.8,.2,1)",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.28em]"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              step 02 — workspace
            </span>
            <span className="h-px flex-1" style={{ background: "var(--color-obsidian-border)" }} />
          </div>

          <h2
            id={titleId}
            className="text-3xl sm:text-4xl tracking-tight leading-[1.05]"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              color: "var(--color-obsidian-text)",
              fontWeight: 400,
            }}
          >
            How should we
            <br />
            <em style={{ fontStyle: "italic", color: "var(--color-obsidian-accent)", fontWeight: 500 }}>
              start your vault?
            </em>
          </h2>
          <p
            id={descId}
            className="text-sm mt-3 mb-7"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            You can switch, import, or wipe this anytime from settings.
          </p>

          <div role="radiogroup" aria-labelledby={titleId} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
            {options.map(({ id, label, desc, icon: Icon, badge }) => {
              const isActive = selected === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelected(id)}
                  className="text-left p-5 rounded-xl transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  style={{
                    background: isActive ? "var(--color-obsidian-bg)" : "var(--color-obsidian-bg)",
                    border: isActive
                      ? "1.5px solid var(--color-obsidian-accent)"
                      : "1.5px solid var(--color-obsidian-border)",
                    boxShadow: isActive
                      ? "0 0 0 4px rgba(59,142,245,0.12), 0 8px 24px rgba(59,142,245,0.18)"
                      : "none",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: isActive ? "var(--color-obsidian-accent)" : "var(--color-obsidian-surface-2)",
                      }}
                      aria-hidden="true"
                    >
                      <Icon size={18} style={{ color: isActive ? "#fff" : "var(--color-obsidian-accent)" }} />
                    </div>
                    {badge && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                        style={{
                          background: "rgba(59,142,245,0.14)",
                          color: "var(--color-obsidian-accent)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
                    {label}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                    {desc}
                  </p>
                  {isActive && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "var(--color-obsidian-accent)" }}
                      aria-hidden="true"
                    >
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px]" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Press <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
              >Enter</kbd> to confirm
            </p>
            <button
              ref={continueRef}
              onClick={() => onSelect(selected)}
              className="px-7 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "var(--color-obsidian-accent)",
                color: "#fff",
                boxShadow: "0 8px 20px rgba(59,142,245,0.25)",
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VaultNameDialog (private sub-component) ─────────────────────────────────

function VaultNameDialog({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const titleId = useId();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.15s ease" }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm p-6 rounded-2xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          animation: "scaleIn 0.18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-sm font-semibold mb-3" style={{ color: "var(--color-obsidian-text)" }}>
          Vault Name
        </h3>
        <input
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm mb-4 outline-none"
          style={{
            background: "var(--color-obsidian-bg)",
            border: "1px solid var(--color-obsidian-border)",
            color: "var(--color-obsidian-text)",
          }}
          placeholder="My Vault"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: name.trim() ? "var(--color-obsidian-accent)" : "var(--color-obsidian-surface-2)",
              color: "#fff",
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UserInfoPanel (private sub-component) ────────────────────────────────────

interface UserInfoPanelProps {
  user: AppState["user"];
  notesCount: number;
  syncStatus: AppState["syncStatus"];
  onClose: () => void;
  onSignIn: () => void;
  onOpenSettings: () => void;
}

function UserInfoPanel({ user, notesCount, syncStatus, onClose, onSignIn, onOpenSettings }: UserInfoPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="user-info-backdrop fixed inset-0 z-[200] flex items-start justify-end pt-12 pr-3"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="user-info-panel w-80 rounded-xl overflow-hidden outline-none"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          animation: "scaleIn 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">Account menu</h2>
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                aria-hidden="true"
              >
                {(user.displayName?.trim()?.charAt(0) || user.email?.trim()?.charAt(0) || "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--color-obsidian-text)" }}>
                  {user.displayName || user.email || "Signed in"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  {user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--color-obsidian-surface-2)" }}
              >
                <User size={20} style={{ color: "var(--color-obsidian-muted-text)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
                  Guest User
                </p>
                <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  Not signed in
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Plan badge */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(59,142,245,0.1)" }}
          >
            <Crown size={16} style={{ color: "var(--color-obsidian-accent)" }} />
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: "var(--color-obsidian-accent)" }}>
                Pro Plan
              </p>
              <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Free forever — all features unlocked
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: "var(--color-obsidian-muted-text)" }} />
              <span className="text-xs" style={{ color: "var(--color-obsidian-text)" }}>
                {notesCount} notes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud size={14} style={{ color: syncStatus === "synced" ? "var(--color-obsidian-accent)" : "var(--color-obsidian-muted-text)" }} />
              <span className="text-xs" style={{ color: "var(--color-obsidian-text)" }}>
                {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync error" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 py-2">
          {!user && (
            <button
              onClick={onSignIn}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:opacity-80"
              style={{ color: "var(--color-obsidian-accent)" }}
            >
              <LogIn size={16} />
              Sign in to sync your notes
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--color-obsidian-text)" }}
          >
            <Settings size={16} style={{ color: "var(--color-obsidian-muted-text)" }} />
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
