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
} from "./MobileNav";
import { SyncService } from "@/lib/firebase/sync";

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"home" | "search" | "graph" | "new" | "settings">("home");
  const [mobileNewNoteMenuOpen, setMobileNewNoteMenuOpen] = useState(false);

  const patch = useCallback((p: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

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

  // Delete note
  const deleteNote = useCallback((id: string) => {
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
      patch({ user, authModalOpen: false, syncStatus: "synced" });
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
      if (e.key === "Escape") {
        if (state.commandPaletteOpen) patch({ commandPaletteOpen: false });
        if (state.settingsOpen) patch({ settingsOpen: false });
        if (state.authModalOpen) patch({ authModalOpen: false });
        if (isMobile) {
          setMobileDrawerOpen(false);
          setMobileNewNoteMenuOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.commandPaletteOpen, state.settingsOpen, state.authModalOpen, state.sidebarCollapsed, patch, createNote, isMobile]);

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
              width: 264,
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
            />
          </div>
        )}

        {/* Center — editor or graph */}
        <div className="flex-1 overflow-hidden" style={{ paddingBottom: isMobile ? 56 : 0 }}>
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
            style={{ width: 240 }}
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
    </div>
  );
}
