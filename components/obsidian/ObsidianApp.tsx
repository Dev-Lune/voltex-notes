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
  activeThemeId: "obsidian-default",
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
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Mobile state
  const isMobile = useMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"home" | "search" | "graph" | "new" | "settings">("home");
  const [mobileNewNoteMenuOpen, setMobileNewNoteMenuOpen] = useState(false);

  const patch = useCallback((p: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  // Apply theme
  useEffect(() => {
    const theme = THEMES.find((t) => t.id === state.activeThemeId) ?? THEMES[0];
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [state.activeThemeId]);

  // Restore Firebase auth session on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase/config");
        const { onAuthStateChanged } = await import("firebase/auth");
        const auth = getFirebaseAuth();
        if (!auth) return;
        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            patch({
              user: {
                email: fbUser.email || "",
                displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
                uid: fbUser.uid,
                photoURL: fbUser.photoURL || undefined,
              },
              syncStatus: "synced",
            });
          } else {
            patch({ user: null, syncStatus: "offline" });
          }
        });
      } catch { /* Firebase not configured — ignore */ }
    })();
    return () => unsubscribe?.();
  }, [patch]);

  // Simulate sync when notes change
  const triggerSync = useCallback(() => {
    if (!state.user) return;
    patch({ syncStatus: "syncing" });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      patch({ syncStatus: "synced" });
    }, 1200);
  }, [state.user, patch]);

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

    setState((prev) => {
      const defaultFolder = prev.preferences.defaultNoteLocation || "root";
      const folder = type === "daily" ? "daily" : type === "drawing" ? "drawings" : defaultFolder;
      const newNote: Note = {
        id,
        title,
        content: type === "markdown" ? `# ${title}\n\nStart writing…` : "",
        tags: [],
        folder,
        createdAt: now,
        updatedAt: now,
        starred: false,
        wordCount: 0,
        type,
      };
      return {
        ...prev,
        notes: [...prev.notes, newNote],
        activeNoteId: id,
        openNoteIds: [...prev.openNoteIds, id],
        mainView: "editor",
      };
    });
    triggerSync();

    // Close mobile menu
    if (isMobile) {
      setMobileNewNoteMenuOpen(false);
      setMobileView("home");
    }
  }, [triggerSync, isMobile]);

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
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => n.id === noteId ? { ...n, folder: folderId } : n),
    }));
    triggerSync();
  }, [triggerSync]);
  // Update note
  const updateNote = useCallback(
    (id: string, noteP: Partial<Note>) => {
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

          return {
            ...n,
            ...noteP,
            wordCount: countWords(nextContent),
            versionHistory: nextHistory,
          };
        }),
      }));
      triggerSync();
    },
    [triggerSync]
  );

  const restoreNoteVersion = useCallback((noteId: string, versionId: string) => {
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

        return {
          ...n,
          content: targetVersion.content,
          updatedAt: restoredDate,
          wordCount: countWords(targetVersion.content),
          versionHistory: [snapshotBeforeRestore, ...history.filter((v) => v.id !== versionId)].slice(0, MAX_NOTE_VERSIONS),
        };
      }),
    }));
    triggerSync();
  }, [triggerSync]);

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
  }, []);

  // Rename note
  const renameNote = useCallback((id: string, title: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, title } : n)),
    }));
  }, []);



  // Handle auth
  const handleAuth = useCallback(
    (user: { email: string; displayName: string; uid: string }) => {
      patch({ user, authModalOpen: false, syncStatus: "synced" });
    },
    [patch]
  );

  const handleSignOut = useCallback(async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase/config");
      const auth = getFirebaseAuth();
      if (auth) await auth.signOut();
    } catch { /* ignore */ }
    patch({ user: null, syncStatus: "offline", settingsOpen: false });
  }, [patch]);

  // Theme change handler
  const handleThemeChange = useCallback((themeId: string) => {
    patch({ activeThemeId: themeId });
  }, [patch]);

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
                triggerSync();
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
