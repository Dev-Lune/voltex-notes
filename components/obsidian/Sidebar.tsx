"use client";

import React, { useState } from "react";
import {
  FileText, Search, Tag, Bookmark, Share2, Plus, ChevronRight,
  ChevronDown, Folder, Star, MoreHorizontal, Trash2, Edit3,
  FolderPlus, Cloud, CloudOff, RefreshCw, Store, Pencil,
  CalendarDays, LayoutGrid, FileCode2, X, CheckSquare, Square
} from "lucide-react";
import {
  Note, Folder as FolderType, AppState, NoteType,
  getAllTags
} from "./data";

interface SidebarProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onNewNote: (type?: NoteType) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onNoteOpen?: (id: string) => void;
  onCreateFolder?: (name: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  isMobile?: boolean;
}

const NAV_ICONS = [
  { id: "files", icon: FileText, label: "Files" },
  { id: "search", icon: Search, label: "Search" },
  { id: "tags", icon: Tag, label: "Tags" },
  { id: "bookmarks", icon: Bookmark, label: "Bookmarks" },
  { id: "graph", icon: Share2, label: "Graph" },
  { id: "marketplace", icon: Store, label: "Marketplace" },
] as const;

type SidebarView = typeof NAV_ICONS[number]["id"];

// ─── Note type icon helper ────────────────────────────────────────────────────

function NoteTypeIcon({ type, size = 13 }: { type?: NoteType; size?: number }) {
  switch (type) {
    case "drawing": return <Pencil size={size} style={{ flexShrink: 0, opacity: 0.7, color: "#cba6f7" }} />;
    case "daily": return <CalendarDays size={size} style={{ flexShrink: 0, opacity: 0.7, color: "#f9e2af" }} />;
    case "kanban": return <LayoutGrid size={size} style={{ flexShrink: 0, opacity: 0.7, color: "#89b4fa" }} />;
    case "table": return <FileCode2 size={size} style={{ flexShrink: 0, opacity: 0.7, color: "#a6e3a1" }} />;
    default: return <FileText size={size} style={{ flexShrink: 0, opacity: 0.7 }} />;
  }
}

// ─── New note type menu ───────────────────────────────────────────────────────

function NewNoteMenu({
  onSelect,
  onClose,
  anchorRect,
  installedPluginIds,
}: {
  onSelect: (type: NoteType) => void;
  onClose: () => void;
  anchorRect?: { left: number; top: number; bottom: number };
  installedPluginIds: string[];
}) {
  const types: Array<{ id: NoteType; label: string; desc: string; icon: React.ElementType; color: string; pluginId: string | null }> = [
    { id: "markdown", label: "Markdown Note", desc: "Rich text with wikilinks", icon: FileText, color: "#cdd6f4", pluginId: null },
    { id: "drawing", label: "Drawing", desc: "Excalidraw canvas", icon: Pencil, color: "#cba6f7", pluginId: "excalidraw" },
    { id: "daily", label: "Daily Note", desc: "Journal entry for today", icon: CalendarDays, color: "#f9e2af", pluginId: null },
    { id: "kanban", label: "Kanban Board", desc: "Task board with columns", icon: LayoutGrid, color: "#89b4fa", pluginId: "obsidian-kanban" },
  ];

  const filtered = types.filter(({ pluginId }) => !pluginId || installedPluginIds.includes(pluginId));

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-56 rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          left: anchorRect ? anchorRect.left + 8 : 310,
          top: anchorRect ? anchorRect.bottom + 4 : 48,
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-obsidian-muted-text)" }}>
            New Note
          </span>
          <button onClick={onClose}>
            <X size={12} style={{ color: "var(--color-obsidian-muted-text)" }} />
          </button>
        </div>
        {filtered.map(({ id, label, desc, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => { onSelect(id); onClose(); }}
            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <Icon size={13} style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-obsidian-text)" }}>
                {label}
              </p>
              <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Sync badge ───────────────────────────────────────────────────────────────

function SyncBadge({ status }: { status: AppState["syncStatus"] }) {
  const map = {
    synced: { icon: Cloud, color: "#a6e3a1", label: "Synced" },
    syncing: { icon: RefreshCw, color: "#f9e2af", label: "Syncing…" },
    offline: { icon: CloudOff, color: "#6c7086", label: "Offline" },
    error: { icon: CloudOff, color: "#f38ba8", label: "Sync error" },
  };
  const { icon: Icon, color, label } = map[status];
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ color }}>
      <Icon size={11} className={status === "syncing" ? "animate-spin" : ""} />
      <span>{label}</span>
    </div>
  );
}

// ─── File tree item ───────────────────────────────────────────────────────────

function FileTreeItem({
  note,
  isActive,
  onClick,
  onDelete,
  onRename,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(note.title);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", note.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer text-sm transition-colors"
      style={{
        background: isSelected ? "rgba(243,139,168,0.15)" : isActive ? "rgba(124,106,247,0.18)" : "transparent",
        color: isActive ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)",
      }}
      onClick={() => {
        if (selectionMode && onToggleSelect) {
          onToggleSelect(note.id);
        } else if (!renaming) {
          onClick();
        }
      }}
      draggable={!renaming && !selectionMode}
      onDragStart={handleDragStart}
    >
      {selectionMode ? (
        <button
          className="shrink-0"
          style={{ color: isSelected ? "#f38ba8" : "var(--color-obsidian-muted-text)" }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(note.id); }}
        >
          {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
        </button>
      ) : (
        <NoteTypeIcon type={note.type} />
      )}
      {renaming ? (
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={() => { if (renameVal.trim()) onRename(note.id, renameVal.trim()); setRenaming(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (renameVal.trim()) onRename(note.id, renameVal.trim()); setRenaming(false); }
            if (e.key === "Escape") setRenaming(false);
          }}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--color-obsidian-text)" }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-xs">{note.title}</span>
      )}
      {note.starred && <Star size={10} style={{ color: "#f9e2af", flexShrink: 0 }} />}
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-opacity"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
      >
        <MoreHorizontal size={12} />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 w-40 rounded-lg overflow-hidden shadow-xl"
          style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-obsidian-text)" }}
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false); }}
          >
            <Edit3 size={11} /> Rename
          </button>
          <button
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
            style={{ color: "#f38ba8" }}
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); setMenuOpen(false); }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Folder group ─────────────────────────────────────────────────────────────

function FolderGroup({
  folder,
  notes,
  activeNoteId,
  onNoteClick,
  onDeleteNote,
  onRenameNote,
  onMoveNoteToFolder,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: {
  folder: FolderType;
  notes: Note[];
  activeNoteId: string | null;
  onNoteClick: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const folderNotes = notes.filter((n) => n.folder === folder.id);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId && onMoveNoteToFolder) {
      onMoveNoteToFolder(noteId, folder.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        className="w-full flex items-center gap-1.5 px-3 py-1 text-xs font-medium uppercase tracking-wider hover:opacity-80 transition-all"
        style={{
          color: "var(--color-obsidian-muted-text)",
          background: dragOver ? "rgba(124,106,247,0.15)" : "transparent",
          borderRadius: 4,
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Folder size={11} />
        <span>{folder.name}</span>
        <span className="ml-auto opacity-60">{folderNotes.length}</span>
      </button>
      {open &&
        folderNotes.map((note) => (
          <FileTreeItem
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            onClick={() => onNoteClick(note.id)}
            onDelete={onDeleteNote}
            onRename={onRenameNote}
            selectionMode={selectionMode}
            isSelected={selectedIds?.has(note.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({
  state,
  onStateChange,
  onNewNote,
  onDeleteNote,
  onRenameNote,
  onNoteOpen,
  onCreateFolder,
  onMoveNoteToFolder,
  isMobile = false,
}: SidebarProps) {
  const { notes, activeNoteId, sidebarView, searchQuery, syncStatus, user, folders } = state;
  const [newNoteMenuOpen, setNewNoteMenuOpen] = useState(false);
  const [newNoteMenuRect, setNewNoteMenuRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allTags = getAllTags(notes);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onDeleteNote(id));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const getFreeTextQuery = (query: string): string =>
    query
      .replace(/(-?(?:path|tag|file|content|has|type|line)):[^\s]+/gi, "")
      .trim()
      .toLowerCase();

  const freeTextQuery = getFreeTextQuery(searchQuery);

  // Advanced search with operators: path:, tag:, file:, content:, has:, type:
  const filteredNotes = (() => {
    if (!searchQuery.trim()) return notes;
    
    // Parse search operators
    const operators: Record<string, string[]> = {
      path: [], tag: [], file: [], content: [], has: [], type: [], line: [], "-tag": [], "-path": []
    };
    let freeText = "";
    
    // Match operators like "tag:something" or "-tag:excluded"
    const opPattern = /(-?(?:path|tag|file|content|has|type|line)):([^\s]+)/gi;
    let remaining = searchQuery;
    let match;
    
    while ((match = opPattern.exec(searchQuery)) !== null) {
      const op = match[1].toLowerCase() as keyof typeof operators;
      const val = match[2].toLowerCase();
      if (operators[op]) {
        operators[op].push(val);
      }
      remaining = remaining.replace(match[0], "");
    }
    
    freeText = remaining.trim().toLowerCase();
    
    return notes.filter((n) => {
      // Path filter
      if (operators.path.length && !operators.path.some(p => n.folder?.toLowerCase().includes(p))) return false;
      if (operators["-path"].length && operators["-path"].some(p => n.folder?.toLowerCase().includes(p))) return false;
      
      // Tag filter
      if (operators.tag.length && !operators.tag.some(t => n.tags.some(nt => nt.toLowerCase().includes(t)))) return false;
      if (operators["-tag"].length && operators["-tag"].some(t => n.tags.some(nt => nt.toLowerCase().includes(t)))) return false;
      
      // File name filter
      if (operators.file.length && !operators.file.some(f => n.title.toLowerCase().includes(f))) return false;
      
      // Content only filter
      if (operators.content.length && !operators.content.some(c => n.content.toLowerCase().includes(c))) return false;

      // Line filter: at least one line containing the term
      if (operators.line.length) {
        const lines = n.content.toLowerCase().split("\n");
        const hasLineMatch = operators.line.some((term) => lines.some((line) => line.includes(term)));
        if (!hasLineMatch) return false;
      }
      
      // Has filter (links, tags, etc.)
      if (operators.has.includes("links") && !n.content.includes("[[")) return false;
      if (operators.has.includes("tags") && n.tags.length === 0) return false;
      if (operators.has.includes("tasks") && !n.content.match(/- \[[ x]\]/)) return false;
      if (operators.has.includes("code") && !n.content.includes("```")) return false;
      
      // Type filter
      if (operators.type.length && !operators.type.includes(n.type ?? "markdown")) return false;
      
      // Free text search
      if (freeText) {
        const matches = 
          n.title.toLowerCase().includes(freeText) ||
          n.content.toLowerCase().includes(freeText) ||
          n.tags.some((t) => t.toLowerCase().includes(freeText));
        if (!matches) return false;
      }
      
      return true;
    });
  })();

  const starredNotes = notes.filter((n) => n.starred);

  return (
    <div className="flex h-full" style={{ background: "var(--color-obsidian-surface)" }}>
      {/* Icon rail */}
      <div
        className="flex flex-col items-center py-2 gap-0.5"
        style={{ width: 44, borderRight: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
      >
        {NAV_ICONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() =>
              onStateChange({
                sidebarView: id as SidebarView,
                mainView: id === "graph" ? "graph" : "editor",
              })
            }
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{
              color: sidebarView === id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
              background: sidebarView === id ? "rgba(124,106,247,0.18)" : "transparent",
            }}
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="flex-1" />

        {/* Sync status dot */}
        <div
          className="w-2 h-2 rounded-full mb-2"
          style={{
            background:
              syncStatus === "synced" ? "#a6e3a1"
              : syncStatus === "syncing" ? "#f9e2af"
              : syncStatus === "error" ? "#f38ba8"
              : "#6c7086",
            boxShadow:
              syncStatus === "synced" ? "0 0 6px #a6e3a1"
              : syncStatus === "syncing" ? "0 0 6px #f9e2af"
              : "none",
          }}
          title={`Sync: ${syncStatus}`}
        />
      </div>

      {/* Panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            {sidebarView === "files" ? "Explorer"
              : sidebarView === "search" ? "Search"
              : sidebarView === "tags" ? "Tags"
              : sidebarView === "bookmarks" ? "Bookmarks"
              : sidebarView === "marketplace" ? "Marketplace"
              : "Graph"}
          </span>
          <div className="flex items-center gap-1">
            {sidebarView === "files" && (
              <button
                onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: selectionMode ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}
                title={selectionMode ? "Exit selection" : "Select files"}
              >
                <CheckSquare size={14} />
              </button>
            )}
            {/* New note button with type picker */}
            <div className="relative">
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setNewNoteMenuRect({ left: rect.left, top: rect.top, bottom: rect.bottom });
                  setNewNoteMenuOpen((v) => !v);
                }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)" }}
                title="New note (Ctrl+N)"
              >
                <Plus size={14} />
              </button>
              {newNoteMenuOpen && (
                <NewNoteMenu
                  onSelect={(type) => onNewNote(type)}
                  onClose={() => setNewNoteMenuOpen(false)}
                  anchorRect={newNoteMenuRect ?? undefined}
                  installedPluginIds={state.installedPluginIds}
                />
              )}
            </div>
            <button
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
              title="New folder"
              onClick={() => setCreatingFolder(true)}
            >
              <FolderPlus size={14} />
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectionMode && (
          <div
            className="flex items-center justify-between px-3 py-1.5 shrink-0"
            style={{ background: "rgba(243,139,168,0.1)", borderBottom: "1px solid var(--color-obsidian-border)" }}
          >
            <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const allIds = notes.map((n) => n.id);
                  setSelectedIds((prev) => prev.size === allIds.length ? new Set() : new Set(allIds));
                }}
                className="px-2 py-0.5 rounded text-xs hover:bg-white/10 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                {selectedIds.size === notes.length ? "Deselect all" : "Select all"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-white/5 transition-colors"
                  style={{ color: "#f38ba8" }}
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
              <button
                onClick={exitSelectionMode}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Sync badge */}
        <SyncBadge status={syncStatus} />

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* Files */}
          {sidebarView === "files" && (
            <div className="flex flex-col gap-1">
              {/* New folder input */}
              {creatingFolder && (
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <Folder size={11} style={{ color: "var(--color-obsidian-muted-text)", flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) {
                        onCreateFolder?.(newFolderName.trim());
                        setNewFolderName("");
                        setCreatingFolder(false);
                      }
                      if (e.key === "Escape") {
                        setNewFolderName("");
                        setCreatingFolder(false);
                      }
                    }}
                    onBlur={() => {
                      if (newFolderName.trim()) {
                        onCreateFolder?.(newFolderName.trim());
                      }
                      setNewFolderName("");
                      setCreatingFolder(false);
                    }}
                    placeholder="Folder name…"
                    className="flex-1 bg-transparent outline-none text-xs"
                    style={{
                      color: "var(--color-obsidian-text)",
                      borderBottom: "1px solid var(--color-obsidian-accent)",
                    }}
                  />
                </div>
              )}
              {folders.filter((f) => f.id !== "root").map((folder) => (
                <FolderGroup
                  key={folder.id}
                  folder={folder}
                  notes={notes}
                  activeNoteId={activeNoteId}
                  onNoteClick={(id) => onNoteOpen ? onNoteOpen(id) : onStateChange({ activeNoteId: id, mainView: "editor" })}
                  onDeleteNote={onDeleteNote}
                  onRenameNote={onRenameNote}
                  onMoveNoteToFolder={onMoveNoteToFolder}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {/* Root-level notes (no folder) */}
              {notes.filter((n) => n.folder === "root" || !n.folder).map((note) => (
                <FileTreeItem
                  key={note.id}
                  note={note}
                  isActive={activeNoteId === note.id}
                  onClick={() => onNoteOpen ? onNoteOpen(note.id) : onStateChange({ activeNoteId: note.id, mainView: "editor" })}
                  onDelete={onDeleteNote}
                  onRename={onRenameNote}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(note.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}

          {/* Search */}
          {sidebarView === "search" && (
            <div className="flex flex-col gap-1 px-2">
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1"
                style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
              >
                <Search size={12} style={{ color: "var(--color-obsidian-muted-text)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => onStateChange({ searchQuery: e.target.value })}
                  placeholder="Search notes… (try tag:, path:, line:)"
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: "var(--color-obsidian-text)" }}
                />
              </div>
              {/* Search operators help */}
              {!searchQuery && (
                <div
                  className="px-2 py-2 rounded text-xs mb-2"
                  style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-muted-text)" }}
                >
                  <p className="font-medium mb-1" style={{ color: "var(--color-obsidian-text)" }}>Search Operators:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span><code className="text-purple-400">tag:</code> by tag</span>
                    <span><code className="text-purple-400">path:</code> by folder</span>
                    <span><code className="text-purple-400">file:</code> by name</span>
                    <span><code className="text-purple-400">type:</code> note type</span>
                    <span><code className="text-purple-400">has:</code> links/tags</span>
                    <span><code className="text-purple-400">line:</code> line text</span>
                    <span><code className="text-purple-400">-tag:</code> exclude</span>
                  </div>
                </div>
              )}
              {searchQuery.trim() && (
                <p className="text-xs mb-1 px-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  {filteredNotes.length} result{filteredNotes.length !== 1 ? "s" : ""}
                </p>
              )}
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onStateChange({ activeNoteId: note.id, mainView: "editor" })}
                  className="text-left px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                  style={{
                    color: activeNoteId === note.id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)",
                    background: activeNoteId === note.id ? "rgba(124,106,247,0.15)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <NoteTypeIcon type={note.type} size={11} />
                    <span className="text-xs font-medium truncate">{note.title}</span>
                  </div>
                  {searchQuery && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      {(() => {
                        const snippetQuery = freeTextQuery || searchQuery.toLowerCase();
                        const idx = note.content.toLowerCase().indexOf(snippetQuery);
                        if (idx < 0) return "";
                        const start = Math.max(0, idx - 20);
                        return "…" + note.content.slice(start, idx + 40) + "…";
                      })()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tags */}
          {sidebarView === "tags" && (
            <div className="flex flex-col gap-0.5 px-2">
              {allTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => onStateChange({ searchQuery: tag, sidebarView: "search" })}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-xs" style={{ color: "var(--color-obsidian-tag)" }}>
                    #{tag}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--color-obsidian-tag-bg)", color: "var(--color-obsidian-muted-text)" }}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Bookmarks */}
          {sidebarView === "bookmarks" && (
            <div className="flex flex-col gap-0.5 px-2">
              {starredNotes.length === 0 && (
                <p className="text-xs px-2 py-3" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  No bookmarked notes yet.
                </p>
              )}
              {starredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onStateChange({ activeNoteId: note.id, mainView: "editor" })}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
                  style={{ color: activeNoteId === note.id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)" }}
                >
                  <Star size={11} style={{ color: "#f9e2af", flexShrink: 0 }} />
                  <span className="text-xs truncate">{note.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Marketplace shortcut */}
          {sidebarView === "marketplace" && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <Store size={28} style={{ color: "var(--color-obsidian-accent)", opacity: 0.7 }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
                Plugin Marketplace
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Discover and install community plugins to extend your vault.
              </p>
              <button
                onClick={() => onStateChange({ marketplaceOpen: true } as Partial<AppState>)}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
              >
                Open Marketplace
              </button>
            </div>
          )}
        </div>

        {/* User area */}
        {user && (
          <div
            className="px-3 py-2 border-t flex items-center gap-2 shrink-0"
            style={{ borderColor: "var(--color-obsidian-border)" }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "var(--color-obsidian-text)" }}>
                {user.displayName}
              </div>
              <div className="text-xs truncate" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* DevLune branding */}
        <a
          href="https://devlune.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-2 rounded-md transition-all hover:opacity-90"
          style={{
            opacity: 0.5,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
            <path d="M13 7.5C12.1 10.6 9.2 12.9 5.8 12.9 2.2 12.9 -0.2 10 0 6.5 0.3 3.1 3 0.5 6.4 0.3 6.1 1.2 6 2.2 6 3.2 6 7.5 9.5 11 13.8 11 13.5 9.9 13.3 8.7 13 7.5Z" fill="var(--color-obsidian-muted-text)"/>
          </svg>
          <span style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.01em", color: "var(--color-obsidian-muted-text)" }}>
            by DevLune
          </span>
        </a>
      </div>
    </div>
  );
}
