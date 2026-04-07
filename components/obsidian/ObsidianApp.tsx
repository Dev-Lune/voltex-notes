"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  AppState, Note, Folder, SAMPLE_NOTES, SAMPLE_FOLDERS,
  countWords, NoteType, THEMES, DEFAULT_PREFERENCES, EditorPreferences, applyTheme,
  Vault
} from "./data";
import TitleBar from "./TitleBar";
import Sidebar from "./Sidebar";
import Editor from "./Editor";
import GraphView from "./GraphView";
import RightPanel from "./RightPanel";
import CommandPalette from "./CommandPalette";
import AuthModal from "./AuthModal";
import SettingsModal from "./SettingsModal";
import CanvasView from "./CanvasView";
import MarketplacePanel from "./MarketplacePanel";
import { SAMPLE_SNIPPETS } from "../../lib/marketplace/data";
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
  X, Sparkles, FileEdit, Link2, Palette, Package,
  Search as SearchIcon, CalendarDays as CalendarIcon,
  FolderTree, History, Download, Command, Cloud,
  Smartphone, BookOpen, FolderOpen, Check,
  Info, Crown, Mail, User, Settings, LogIn, FileText, HardDrive,
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
  const [state, setState] = useState<AppState>(() => {
    // On Electron, start with empty state — loadVault will populate it
    const electron = typeof window !== "undefined" && "electronAPI" in window;
    if (electron) {
      return {
        ...INITIAL_STATE,
        notes: [],
        folders: [{ id: "root", name: "Vault", parentId: null }],
        activeNoteId: null,
        openNoteIds: [],
      };
    }
    return INITIAL_STATE;
  });
  const historyRef = useRef<string[]>([SAMPLE_NOTES[0].id]);
  const historyIdxRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
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

  // ── Auto-updater state ─────────────────────────────────────────────────────
  const [updateReady, setUpdateReady] = useState<string | null>(null);

  // ── Vault (Electron desktop only) ──────────────────────────────────────────
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [recentVaults, setRecentVaults] = useState<Array<{ path: string; name: string; lastOpened: number }>>([]);
  const vaultSaveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
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
      localStorage.setItem(`voltex-vault-${vaultId}-notes`, JSON.stringify(notes));
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
    const blankNote: Note = {
      id: `note-${Date.now()}`,
      title: "Untitled",
      content: `# ${name}\n\nStart writing…`,
      tags: [],
      folder: "root",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      starred: false,
      wordCount: 0,
      type: "markdown",
    };
    const folders: Folder[] = [{ id: "root", name: "Vault", parentId: null }];
    saveWebVaultData(id, [blankNote], folders);

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
        activeVaultId: vaultId,
      }));
    } else {
      const blankNote: Note = {
        id: `note-${Date.now()}`,
        title: "Untitled",
        content: `# ${vault?.name || "Vault"}\n\nStart writing…`,
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
      const blankNote: Note = {
        id: `note-${Date.now()}`,
        title: "Untitled",
        content: "# Untitled\n\nStart writing\u2026",
        tags: [],
        folder: "root",
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
        starred: false,
        wordCount: 0,
        type: "markdown",
      };
      patch({
        notes: [blankNote],
        folders: [{ id: "root", name: "Vault", parentId: null }],
        activeNoteId: blankNote.id,
        openNoteIds: [blankNote.id],
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

      // If workspace was configured as "empty", initialize with blank state
      if (workspaceConfigured === "empty") {
        setState((prev) => {
          // Only override if still using sample data (first mount)
          if (prev.notes.length === SAMPLE_NOTES.length && prev.notes[0]?.id === SAMPLE_NOTES[0].id) {
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
            return {
              ...prev,
              notes: [blankNote],
              folders: [{ id: "root", name: "Vault", parentId: null }],
              activeNoteId: blankNote.id,
              openNoteIds: [blankNote.id],
            };
          }
          return prev;
        });
      }

      if (!welcomeDismissed && !workspaceConfigured) {
        // Brand new user — show welcome first
        setWelcomeModalOpen(true);
      } else if (welcomeDismissed && !workspaceConfigured) {
        // Welcome was dismissed but workspace not configured yet
        setWorkspaceSetupOpen(true);
      } else {
        setAppReady(true);
      }
    } catch {
      setAppReady(true);
    }
  }, []);

  // Auto-collapse right panel on small desktop viewports
  useEffect(() => {
    if (isMobile) return;
    if (viewportWidth > 0 && viewportWidth < 1100) {
      patch({ rightPanelOpen: false });
    }
  }, [viewportWidth, isMobile, patch]);

  // Apply theme + persist
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === state.activeThemeId) ?? THEMES[0];
    applyTheme(theme);
    // Sync Electron window background color with theme
    if (isElectron()) {
      const bgColor = theme.vars["--obs-bg"] ?? "#1e1e2e";
      windowClient.setBackgroundColor(bgColor);
    }
    // Save to localStorage
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

  // Load saved theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("voltex-theme");
      if (saved && THEMES.find((t) => t.id === saved)) {
        patch({ activeThemeId: saved });
      }
    } catch { /* ignore */ }
  }, [patch]);

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

            // Load theme from Firestore
            try {
              const db = getFirebaseDb();
              if (db) {
                const prefSnap = await getDoc(doc(db, "users", fbUser.uid, "settings", "preferences"));
                if (prefSnap.exists()) {
                  const data = prefSnap.data();
                  if (data.activeThemeId && THEMES.find((t) => t.id === data.activeThemeId)) {
                    patch({ activeThemeId: data.activeThemeId });
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
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: newOpen,
          mainView: "editor",
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
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: alreadyOpen ? prev.openNoteIds : [...prev.openNoteIds, id],
          mainView: "editor",
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
        return {
          ...prev,
          activeNoteId: id,
          openNoteIds: alreadyOpen ? prev.openNoteIds : [...prev.openNoteIds, id],
          mainView: "editor",
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
      : "Untitled";

    const defaultFolder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : "root";
    const defaultKanbanContent = JSON.stringify({
      columns: [
        { id: "col-todo", label: "To Do", color: "#89b4fa", cards: [] },
        { id: "col-progress", label: "In Progress", color: "#f9e2af", cards: [] },
        { id: "col-done", label: "Done", color: "#a6e3a1", cards: [] },
      ],
    });
    const newNote: Note = {
      id,
      title,
      content: type === "markdown" ? `# ${title}\n\nStart writing…` : type === "kanban" ? defaultKanbanContent : "",
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
      const folder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : (prev.preferences.defaultNoteLocation || "root");
      finalNote = { ...newNote, folder };

      // Ensure the target folder exists so the note is visible in the sidebar
      const folderNames: Record<string, string> = { daily: "Daily Notes", drawings: "Drawings" };
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
        mainView: "editor",
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
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          if (n.id !== id) return n;

          const nextContent = noteP.content ?? n.content;
          const contentChanged = typeof noteP.content === "string" && noteP.content !== n.content;
          const history = n.versionHistory ?? [];

          const nextHistory = contentChanged
            ? [
                {
                  id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  content: n.content,
                  title: n.title,
                  savedAt: new Date().toISOString(),
                  updatedAt: n.updatedAt,
                },
                ...history,
              ].slice(0, MAX_NOTE_VERSIONS)
            : history;

          const result = {
            ...n,
            ...noteP,
            wordCount: countWords(nextContent),
            versionHistory: nextHistory,
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
        patch({ mainView: "canvas" });
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
          const noteTitle = s.notes.find((n) => n.id === s.activeNoteId)?.title ?? "this note";
          if (confirm(`Move "${noteTitle}" to trash?`)) {
            deleteNoteRef.current(s.activeNoteId);
          }
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

  return (
    <div
      ref={mainRef}
      className="obsidian-app-root flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--color-obsidian-bg)" }}
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
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && !state.sidebarCollapsed && (
          <div
            className="shrink-0 hide-mobile"
            style={{
              width: isSmallDesktop ? 220 : 264,
              borderRight: "1px solid var(--color-obsidian-border)",
              overflow: "visible",
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
            />
          </div>
        )}

        {/* Center — editor or graph */}
        <div className="flex-1 overflow-hidden" style={{ paddingBottom: isMobile ? 80 : 0, minWidth: isMobile ? undefined : 400 }}>
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
          ) : state.mainView === "canvas" ? (
            <CanvasView
              notes={state.notes}
              onNoteClick={(id) => openNote(id)}
            />
          ) : (
            <GraphView
              notes={state.notes}
              activeNoteId={state.activeNoteId}
              onNoteClick={(id) => openNote(id)}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* Desktop Right panel */}
        {!isMobile && state.rightPanelOpen && (
          <div
            className="shrink-0 overflow-hidden hide-mobile"
            style={{ width: isSmallDesktop ? 200 : 240 }}
          >
            <RightPanel
              state={state}
              onStateChange={patch}
              onNoteClick={openNote}
              onRestoreVersion={restoreNoteVersion}
              onNewDailyNote={(date) => {
                // Create a daily note for the specified date
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
                setState((prev) => ({
                  ...prev,
                  notes: [...prev.notes, newNote],
                  activeNoteId: id,
                  openNoteIds: [...prev.openNoteIds, id],
                  mainView: "editor",
                }));
                pushNoteToFirestore(newNote);
              }}
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
            onNewDailyNote={(date) => {
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
              setState((prev) => ({
                ...prev,
                notes: [...prev.notes, newNote],
                activeNoteId: id,
                openNoteIds: [...prev.openNoteIds, id],
                mainView: "editor",
              }));
              pushNoteToFirestore(newNote);
              setMobileRightPanelOpen(false);
            }}
          />
        </MobileDrawer>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeView={state.mainView === "graph" ? "graph" : mobileView}
        onNavigate={handleMobileNavigate}
        onNewNoteMenu={() => setMobileNewNoteMenuOpen(true)}
      />

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
            setWorkspaceSetupOpen(false);
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
              }));
            }
            setAppReady(true);
          }}
        />
      )}

      {/* Plugin install toast notification */}
      {pluginToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3 transition-all duration-500"
          style={{
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-accent)",
            boxShadow: "0 8px 32px rgba(124,106,247,0.3)",
            opacity: pluginToast.visible ? 1 : 0,
            transform: `translateX(-50%) translateY(${pluginToast.visible ? "0" : "20px"})`,
          }}
        >
          <span style={{ color: "var(--color-obsidian-accent)", fontSize: "18px", lineHeight: 1, marginTop: "1px" }}>✓</span>
          <p className="text-sm leading-snug" style={{ color: "var(--color-obsidian-text)" }}>
            {pluginToast.message}
          </p>
        </div>
      )}

      {/* Vault sync prompt */}
      {syncPromptVisible && (
        <div
          className="fixed bottom-6 left-1/2 z-[9999] max-w-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          style={{
            transform: "translateX(-50%)",
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <Cloud size={18} style={{ color: "var(--color-obsidian-accent)", flexShrink: 0 }} />
          <span className="text-sm" style={{ color: "var(--color-obsidian-text)" }}>
            Sync <strong>{vaultPath ? vaultPath.replace(/\\/g, "/").split("/").pop() : "vault"}</strong> to cloud?
          </span>
          <button
            className="px-3 py-1 rounded-md text-xs font-medium"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
            onClick={async () => {
              setSyncPromptVisible(false);
              if (syncServiceRef.current) {
                patch({ syncStatus: "syncing" });
                await syncServiceRef.current.syncAll(state.notes);
                // Also push folder metadata
                await syncServiceRef.current.pushFolders(state.folders);
                // Mark all current folders as synced
                const syncedIds = state.folders.filter(f => f.id !== "root").map(f => f.id);
                patch({
                  syncedFolderIds: syncedIds,
                  folders: state.folders.map(f => f.id === "root" ? f : { ...f, synced: true }),
                });
              }
            }}
          >
            Sync
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            onClick={() => setSyncPromptVisible(false)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── WelcomeModal (private sub-component) ─────────────────────────────────────

const WELCOME_FEATURES = [
  { icon: FileEdit, title: "Markdown Editor", desc: "Inline editor with live split preview and syntax highlighting" },
  { icon: Link2, title: "Bidirectional Wikilinks", desc: "Connect notes with [[wikilinks]] and explore your knowledge graph" },
  { icon: Palette, title: "9+ Themes", desc: "Dark & light themes with a custom color editor for full control" },
  { icon: Package, title: "Plugin Marketplace", desc: "Excalidraw, Kanban, AI Assistant, and community plugins" },
  { icon: SearchIcon, title: "Tags & Search", desc: "Tags, bookmarks, and full-text search across your entire vault" },
  { icon: CalendarIcon, title: "Daily Notes", desc: "Templated daily journal entries with one-click creation" },
  { icon: FolderTree, title: "Folder Organization", desc: "Drag-and-drop folder tree with nested hierarchy support" },
  { icon: History, title: "Version History", desc: "Automatic snapshots with one-click rollback to any version" },
  { icon: Download, title: "Export as ZIP", desc: "Download your entire vault as a portable ZIP archive" },
  { icon: Command, title: "Keyboard Shortcuts", desc: "Ctrl+P command palette, Ctrl+N new note, and many more" },
] as const;

interface WelcomeModalProps {
  onDismiss: () => void;
  onSignIn: () => void;
  onOpenVault?: () => void;
  onCreateVault?: () => void;
  recentVaults?: Array<{ path: string; name: string; lastOpened: number }>;
  onOpenRecent?: (vaultPath: string) => void;
}
function WelcomeModal({ onDismiss, onSignIn, onOpenVault, onCreateVault, recentVaults, onOpenRecent }: WelcomeModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          animation: "scaleIn 0.3s ease",
          maxHeight: "calc(100dvh - 32px)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 hover:bg-white/10"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col md:flex-row" style={{ maxHeight: "calc(100dvh - 34px)", overflowY: "auto" }}>
          {/* Left — Features */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto" style={{ borderRight: "1px solid var(--color-obsidian-border)" }}>
            {/* Mini hero */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--color-obsidian-accent)" }}
              >
                <Sparkles size={20} color="#fff" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--color-obsidian-text)" }}>
                  Welcome to Voltex Notes
                </h1>
                <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  Your personal knowledge base — supercharged
                </p>
              </div>
            </div>

            {/* Feature list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WELCOME_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  style={{ background: "var(--color-obsidian-bg)" }}
                >
                  <div
                    className="shrink-0 mt-px p-1.5 rounded-md"
                    style={{ background: "var(--color-obsidian-surface-2)" }}
                  >
                    <f.icon size={15} style={{ color: "var(--color-obsidian-accent)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
                      {f.title}
                    </p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile callout */}
            <div className="flex items-center gap-2 mt-4">
              <Smartphone size={14} style={{ color: "var(--color-obsidian-muted-text)" }} />
              <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Works beautifully on mobile with gestures and bottom nav
              </p>
            </div>
          </div>

          {/* Right — Account */}
          <div
            className="w-full md:w-72 shrink-0 p-6 md:p-8 flex flex-col justify-center"
            style={{ background: "var(--color-obsidian-bg)" }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--color-obsidian-surface-2)" }}
              >
                <Cloud size={26} style={{ color: "var(--color-obsidian-accent)" }} />
              </div>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
                Cloud Sync
              </h2>
              <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Sign in to sync your notes across all devices in real-time. Encrypted and private.
              </p>

              <button
                onClick={onSignIn}
                className="w-full px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 mb-3"
                style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
              >
                Sign In
              </button>
              <button
                onClick={onDismiss}
                className="text-xs transition-opacity hover:opacity-80 mb-6"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                Continue without account
              </button>

              <div className="w-full h-px mb-5" style={{ background: "var(--color-obsidian-border)" }} />

              <button
                onClick={onDismiss}
                className="w-full px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "var(--color-obsidian-surface)",
                  color: "var(--color-obsidian-text)",
                  border: "1px solid var(--color-obsidian-border)",
                }}
              >
                Get Started
              </button>

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
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mb-2 text-left transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                      >
                        <FolderOpen size={14} /> Open Folder...
                      </button>
                    )}
                    {onCreateVault && (
                      <button
                        onClick={onCreateVault}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mb-2 text-left transition-opacity hover:opacity-90"
                        style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}
                      >
                        <HardDrive size={14} /> Create New Vault...
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WorkspaceSetupDialog (private sub-component) ─────────────────────────────

function WorkspaceSetupDialog({ onSelect }: { onSelect: (choice: "docs" | "empty") => void }) {
  const [selected, setSelected] = useState<"docs" | "empty" | null>(null);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          animation: "scaleIn 0.3s ease",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
        }}
      >
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: "var(--color-obsidian-text)" }}>
            Set Up Your Workspace
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Choose how you want to start your vault
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Option A: Documentation */}
            <button
              onClick={() => setSelected("docs")}
              className="text-left p-5 rounded-xl transition-all"
              style={{
                background: "var(--color-obsidian-bg)",
                border: selected === "docs"
                  ? "2px solid var(--color-obsidian-accent)"
                  : "2px solid var(--color-obsidian-border)",
                boxShadow: selected === "docs"
                  ? "0 0 20px rgba(59,142,245,0.15)"
                  : "none",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={22} style={{ color: "var(--color-obsidian-accent)" }} />
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(59,142,245,0.15)",
                    color: "var(--color-obsidian-accent)",
                  }}
                >
                  Recommended
                </span>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
                Start with Documentation
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Pre-load your workspace with guides, templates, and examples. Includes Getting Started, Markdown reference, and Wikilinks tutorial.
              </p>
              {selected === "docs" && (
                <div className="mt-3 flex items-center gap-1" style={{ color: "var(--color-obsidian-accent)" }}>
                  <Check size={16} />
                  <span className="text-xs font-semibold">Selected</span>
                </div>
              )}
            </button>

            {/* Option B: Empty workspace */}
            <button
              onClick={() => setSelected("empty")}
              className="text-left p-5 rounded-xl transition-all"
              style={{
                background: "var(--color-obsidian-bg)",
                border: selected === "empty"
                  ? "2px solid var(--color-obsidian-accent)"
                  : "2px solid var(--color-obsidian-border)",
                boxShadow: selected === "empty"
                  ? "0 0 20px rgba(59,142,245,0.15)"
                  : "none",
              }}
            >
              <FolderOpen size={22} style={{ color: "var(--color-obsidian-accent)" }} className="mb-3" />
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
                Start with Empty Workspace
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Begin with a clean slate. Just an empty vault with a root folder — perfect if you know what you&#39;re doing or want to import your own notes.
              </p>
              {selected === "empty" && (
                <div className="mt-3 flex items-center gap-1" style={{ color: "var(--color-obsidian-accent)" }}>
                  <Check size={16} />
                  <span className="text-xs font-semibold">Selected</span>
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => selected && onSelect(selected)}
              disabled={!selected}
              className="px-8 py-3 rounded-xl text-base font-semibold transition-opacity"
              style={{
                background: selected ? "var(--color-obsidian-accent)" : "var(--color-obsidian-surface-2)",
                color: selected ? "#fff" : "var(--color-obsidian-muted-text)",
                cursor: selected ? "pointer" : "not-allowed",
                opacity: selected ? 1 : 0.6,
              }}
            >
              Continue
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
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.5)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm mx-4 p-6 rounded-xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          animation: "scaleIn 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-obsidian-text)" }}>
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
  return (
    <div
      className="user-info-backdrop fixed inset-0 z-[200] flex items-start justify-end pt-12 pr-3"
      onClick={onClose}
    >
      <div
        className="user-info-panel w-80 rounded-xl overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          animation: "scaleIn 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--color-obsidian-text)" }}>
                  {user.displayName}
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
