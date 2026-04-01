"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  AppState, Note, SAMPLE_NOTES, SAMPLE_FOLDERS,
  countWords, NoteType, THEMES, DEFAULT_PREFERENCES, EditorPreferences
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
import {
  X, Sparkles, FileEdit, Link2, Palette, Package,
  Search as SearchIcon, CalendarDays as CalendarIcon,
  FolderTree, History, Download, Command, Cloud,
  Smartphone, BookOpen, FolderOpen, Check,
  Info, Crown, Mail, User, Settings, LogIn, FileText,
} from "lucide-react";

const INITIAL_STATE: AppState = {
  notes: SAMPLE_NOTES,
  folders: SAMPLE_FOLDERS,
  activeNoteId: SAMPLE_NOTES[0].id,
  openNoteIds: [SAMPLE_NOTES[0].id, SAMPLE_NOTES[1].id, SAMPLE_NOTES[2].id],
  sidebarView: "files",
  viewMode: "split",
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
  preferences: DEFAULT_PREFERENCES,
};

const MAX_NOTE_VERSIONS = 50;

export default function ObsidianApp() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const historyRef = useRef<string[]>([SAMPLE_NOTES[0].id]);
  const historyIdxRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const syncServiceRef = useRef<SyncService | null>(null);
  const pushDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Mobile state
  const isMobile = useMobile();
  const isSmallDesktop = useSmallDesktop();
  const viewportWidth = useViewportWidth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"home" | "search" | "graph" | "new" | "settings">("home");
  const [mobileNewNoteMenuOpen, setMobileNewNoteMenuOpen] = useState(false);

  // Welcome / workspace setup state
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [userInfoOpen, setUserInfoOpen] = useState(false);

  const patch = useCallback((p: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  // First-run detection: show welcome modal and/or workspace setup
  useEffect(() => {
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

  // Auto-collapse panels on small desktop viewports
  useEffect(() => {
    if (isMobile) return;
    if (viewportWidth > 0 && viewportWidth < 1100) {
      patch({ rightPanelOpen: false });
    }
    if (viewportWidth > 0 && viewportWidth < 900) {
      patch({ sidebarCollapsed: true });
    }
  }, [viewportWidth, isMobile, patch]);

  // Apply theme + persist
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === state.activeThemeId) ?? THEMES[0];
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    // Save to localStorage
    try { localStorage.setItem("voltex-theme", state.activeThemeId); } catch { /* ignore */ }
  }, [state.activeThemeId]);

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
              service.onRemoteChange((remoteNotes) => {
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
                    activeNoteId: newActiveNoteId,
                    openNoteIds: newOpenNoteIds,
                  };
                });
              });

              syncServiceRef.current = service;
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
  }, [patch]);

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
      setState((prev) => ({
        ...prev,
        activeNoteId: id,
        mainView: "editor",
      }));
    }
  }, []);

  const navigateForward = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      const id = historyRef.current[historyIdxRef.current];
      setState((prev) => ({
        ...prev,
        activeNoteId: id,
        mainView: "editor",
      }));
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
    const newNote: Note = {
      id,
      title,
      content: type === "markdown" ? `# ${title}\n\nStart writing…` : "",
      tags: [],
      folder: defaultFolder,
      createdAt: now,
      updatedAt: now,
      starred: false,
      wordCount: 0,
      type,
    };

    setState((prev) => {
      const folder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : (prev.preferences.defaultNoteLocation || "root");
      newNote.folder = folder;
      return {
        ...prev,
        notes: [...prev.notes, newNote],
        activeNoteId: id,
        openNoteIds: [...prev.openNoteIds, id],
        mainView: "editor",
      };
    });
    pushNoteToFirestore(newNote);

    // Close mobile menu
    if (isMobile) {
      setMobileNewNoteMenuOpen(false);
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
  }, []);

  // Import markdown files
  const importNotes = useCallback((files: { title: string; content: string }[]) => {
    const now = new Date().toISOString().split("T")[0];
    const newNotes: Note[] = files.map((f, i) => ({
      id: `note-${Date.now()}-${i}`,
      title: f.title,
      content: f.content,
      tags: [],
      folder: "root",
      createdAt: now,
      updatedAt: now,
      starred: false,
      wordCount: f.content.split(/\s+/).filter(Boolean).length,
      type: "markdown" as NoteType,
    }));
    setState((prev) => ({
      ...prev,
      notes: [...prev.notes, ...newNotes],
    }));
    newNotes.forEach((n) => pushNoteToFirestore(n));
  }, [pushNoteToFirestore]);

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
    if (movedNote) pushNoteToFirestore(movedNote);
  }, [pushNoteToFirestore]);
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
      if (updatedNote) pushNoteToFirestore(updatedNote);
    },
    [pushNoteToFirestore]
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
    setState((prev) => {
      const openRemaining = prev.openNoteIds.filter((oid) => oid !== id);
      const newActive =
        prev.activeNoteId === id
          ? openRemaining[openRemaining.length - 1] ?? null
          : prev.activeNoteId;
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, trashed: true, trashedAt: new Date().toISOString() } : n
        ),
        openNoteIds: openRemaining,
        activeNoteId: newActive,
      };
    });
    // Sync the soft-deleted note to Firestore
    setState((prev) => {
      const trashedNote = prev.notes.find((n) => n.id === id);
      if (trashedNote) pushNoteToFirestore(trashedNote);
      return prev;
    });
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
    if (renamedNote) pushNoteToFirestore(renamedNote);
  }, [pushNoteToFirestore]);



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
    setState((prev) => ({
      ...prev,
      installedPluginIds: prev.installedPluginIds.includes(id)
        ? prev.installedPluginIds
        : [...prev.installedPluginIds, id],
    }));
  }, []);

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

  // Mobile navigation handler
  const handleMobileNavigate = useCallback((view: "home" | "search" | "graph" | "new" | "settings") => {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "p") {
        e.preventDefault();
        patch({ commandPaletteOpen: true });
      }
      if (ctrl && e.key === "n") {
        e.preventDefault();
        if (isMobile) {
          setMobileNewNoteMenuOpen(true);
        } else {
          createNote();
        }
      }
      if (ctrl && e.key === "e") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          viewMode:
            prev.viewMode === "editor"
              ? "preview"
              : prev.viewMode === "preview"
              ? "split"
              : "editor",
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
          patch({ sidebarCollapsed: !state.sidebarCollapsed });
        }
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        // Manual save — trigger sync for active note
        const active = state.notes.find((n) => n.id === state.activeNoteId);
        if (active) pushNoteToFirestore(active);
      }
      if (ctrl && e.key === "d") {
        e.preventDefault();
        if (state.activeNoteId) deleteNote(state.activeNoteId);
      }
      if (ctrl && e.key === "l") {
        e.preventDefault();
        // Toggle checkbox on current line (handled by Editor)
      }
      if (e.key === "Escape") {
        if (welcomeModalOpen) {
          setWelcomeModalOpen(false);
          try { localStorage.setItem("voltex-welcome-dismissed", "true"); } catch { /* ignore */ }
        }
        if (workspaceSetupOpen) {
          // Don't allow escape to skip workspace setup
        }
        if (state.commandPaletteOpen) patch({ commandPaletteOpen: false });
        if (state.settingsOpen) patch({ settingsOpen: false });
        if (state.authModalOpen) patch({ authModalOpen: false });
        if (userInfoOpen) setUserInfoOpen(false);
        if (isMobile) {
          setMobileDrawerOpen(false);
          setMobileNewNoteMenuOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.commandPaletteOpen, state.settingsOpen, state.authModalOpen, state.sidebarCollapsed, state.activeNoteId, state.notes, patch, createNote, deleteNote, pushNoteToFirestore, isMobile, userInfoOpen, welcomeModalOpen, workspaceSetupOpen]);

  const activeNote = state.notes.find((n) => n.id === state.activeNoteId);

  return (
    <div
      ref={mainRef}
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--color-obsidian-bg)" }}
    >
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
        />
      </div>

      {/* Mobile Header */}
      <MobileHeader
        title={activeNote?.title ?? "Obsidian Cloud"}
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
              onMoveNoteToFolder={moveNoteToFolder}
              onPermanentlyDelete={permanentlyDeleteNote}
              onRestoreNote={restoreNote}
              onTogglePin={togglePinNote}
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
        title="Obsidian Cloud"
      >
        <Sidebar
          state={state}
          onStateChange={patch}
          onNewNote={(type) => { createNote(type); setMobileDrawerOpen(false); }}
          onDeleteNote={deleteNote}
          onRenameNote={renameNote}
          onNoteOpen={(id) => { openNote(id); setMobileDrawerOpen(false); }}
          isMobile={true}
          onPermanentlyDelete={permanentlyDeleteNote}
          onRestoreNote={restoreNote}
          onTogglePin={togglePinNote}
        />
      </MobileDrawer>

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
          onSyncStatusChange={(s) => patch({ syncStatus: s })}
          onThemeChange={handleThemeChange}
          onPreferencesChange={handlePreferencesChange}
          onOpenMarketplace={() => patch({ marketplaceOpen: true, settingsOpen: false })}
          onImportNotes={importNotes}
        />
      )}

      {state.marketplaceOpen && (
        <MarketplacePanel
          installedIds={state.installedPluginIds}
          onInstall={handleMarketplaceInstall}
          onUninstall={handleMarketplaceUninstall}
          onClose={() => patch({ marketplaceOpen: false })}
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

function WelcomeModal({ onDismiss, onSignIn }: { onDismiss: () => void; onSignIn: () => void }) {
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
