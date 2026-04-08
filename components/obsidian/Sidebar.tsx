"use client";

import React, { useState } from "react";
import {
  FileText, Search, Tag, Bookmark, Share2, Plus, ChevronRight,
  ChevronDown, Folder, Star, MoreHorizontal, Trash2, Edit3,
  FolderPlus, Cloud, CloudOff, RefreshCw, Store, Pencil,
  CalendarDays, LayoutGrid, FileCode2, X, CheckSquare, Square,
  Pin, ArrowUpDown, RotateCcw, ArrowDownAZ, ArrowUpAZ, Clock,
  FolderOpen, ChevronUp, Check, Layers
} from "lucide-react";
import {
  Note, Folder as FolderType, AppState, NoteType,
  getAllTags, Vault
} from "./data";

interface SidebarProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onNewNote: (type?: NoteType) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onNoteOpen?: (id: string) => void;
  onCreateFolder?: (name: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  isMobile?: boolean;
  onPermanentlyDelete?: (id: string) => void;
  onRestoreNote?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  vaultPath?: string;
  /** Imperative handle: parent can trigger select-all */
  selectAllRef?: React.RefObject<{ selectAll: () => void } | null>;
  /** Web vault management */
  webVaults?: Vault[];
  activeWebVaultId?: string | null;
  onCreateWebVault?: (name: string) => void;
  onSwitchWebVault?: (vaultId: string) => void;
  /** Electron vault management */
  onOpenVault?: () => void;
  onCreateVault?: () => void;
}

type SortMode = "modified" | "created" | "title-asc" | "title-desc";

const NAV_ICONS = [
  { id: "files", icon: FileText, label: "Files" },
  { id: "search", icon: Search, label: "Search" },
  { id: "tags", icon: Tag, label: "Tags" },
  { id: "bookmarks", icon: Bookmark, label: "Bookmarks" },
  { id: "trash", icon: Trash2, label: "Trash" },
  { id: "graph", icon: Share2, label: "Graph" },
  { id: "canvas", icon: Layers, label: "Canvas" },
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
    case "canvas": return <Layers size={size} style={{ flexShrink: 0, opacity: 0.7, color: "#74c7ec" }} />;
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
    { id: "table", label: "Table Note", desc: "Structured data table", icon: FileCode2, color: "#a6e3a1", pluginId: null },
    { id: "canvas", label: "Canvas", desc: "Visual note board", icon: Layers, color: "#74c7ec", pluginId: null },
  ];

  const filtered = types.filter(({ pluginId }) => !pluginId || installedPluginIds.includes(pluginId));

  // Clamp position so the menu stays within the viewport
  const menuWidth = 224; // w-56 = 14rem = 224px
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 400;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const rawLeft = anchorRect ? anchorRect.left + 8 : 16;
  const rawTop = anchorRect ? anchorRect.bottom + 4 : 48;
  const clampedLeft = Math.min(rawLeft, viewportW - menuWidth - 8);
  const clampedTop = Math.min(rawTop, viewportH - 250);

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-56 rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          left: Math.max(8, clampedLeft),
          top: Math.max(8, clampedTop),
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-obsidian-muted-text)" }}>
            New Note
          </span>
          <button onClick={onClose} aria-label="Close menu">
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
  onStarToggle,
  onPinToggle,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onStarToggle?: (id: string, starred: boolean) => void;
  onPinToggle?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(note.title);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/note-id", note.id);
    e.dataTransfer.setData("text/plain", note.id);
    e.dataTransfer.effectAllowed = "move";
    // Custom drag ghost showing note title
    const ghost = document.createElement("div");
    ghost.textContent = note.title;
    ghost.style.cssText = "position:absolute;top:-9999px;left:-9999px;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:500;color:#fff;background:#333;white-space:nowrap;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  const openMenu = (pos: { x: number; y: number } | null) => {
    setMenuPos(pos);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuPos(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems = (
    <>
      <button
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
        style={{ color: "var(--color-obsidian-text)" }}
        onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameVal(note.title); closeMenu(); }}
      >
        <Edit3 size={11} /> Rename
      </button>
      {onStarToggle && (
        <button
          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
          style={{ color: note.starred ? "#f9e2af" : "var(--color-obsidian-text)" }}
          onClick={(e) => { e.stopPropagation(); onStarToggle(note.id, !note.starred); closeMenu(); }}
        >
          {note.starred ? <Star size={11} /> : <Bookmark size={11} />}
          {note.starred ? "Remove bookmark" : "Bookmark"}
        </button>
      )}
      {onPinToggle && (
        <button
          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
          style={{ color: note.pinned ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)" }}
          onClick={(e) => { e.stopPropagation(); onPinToggle(note.id); closeMenu(); }}
        >
          <Pin size={11} /> {note.pinned ? "Unpin" : "Pin to top"}
        </button>
      )}
      <div style={{ borderTop: "1px solid var(--color-obsidian-border)", margin: "2px 0" }} />
      <button
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
        style={{ color: "#f38ba8" }}
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); closeMenu(); }}
      >
        <Trash2 size={11} /> Delete
      </button>
    </>
  );

  return (
    <div
      data-file-item
      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)] focus-visible:outline-none"
      tabIndex={0}
      style={{
        background: isSelected ? "rgba(243,139,168,0.15)" : isActive ? "color-mix(in srgb, var(--color-obsidian-accent) 13%, transparent)" : "transparent",
        color: isActive ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)",
      }}
      onClick={() => {
        if (selectionMode && onToggleSelect) {
          onToggleSelect(note.id);
        } else if (!renaming) {
          onClick();
        }
      }}
      onContextMenu={handleContextMenu}
      draggable={!renaming && !selectionMode}
      onDragStart={handleDragStart}
    >
      {selectionMode ? (
        <button
          className="shrink-0"
          style={{ color: isSelected ? "#f38ba8" : "var(--color-obsidian-muted-text)" }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(note.id); }}
          aria-label={isSelected ? "Deselect note" : "Select note"}
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
        <span className="flex-1 truncate text-sm">{note.title}</span>
      )}
      {note.pinned && <Pin size={10} className="group-hover:hidden" style={{ color: "var(--color-obsidian-accent-soft)", flexShrink: 0 }} />}
      {note.starred && <Star size={10} className="group-hover:hidden" style={{ color: "#f9e2af", flexShrink: 0 }} />}
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "#ef4444" }}
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          aria-label="Delete note"
        >
          <Trash2 size={12} />
        </button>
        <button
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          onClick={(e) => { e.stopPropagation(); openMenu(null); }}
          aria-label="More options"
        >
          <MoreHorizontal size={12} />
        </button>
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={(e) => { e.stopPropagation(); closeMenu(); }} />
          <div
            className="z-[1000] w-44 rounded-lg overflow-hidden shadow-xl"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              ...(menuPos
                ? {
                    position: "fixed" as const,
                    left: Math.min(menuPos.x, (typeof window !== "undefined" ? window.innerWidth : 400) - 184),
                    top: Math.min(menuPos.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 200),
                  }
                : { position: "absolute" as const, right: 0, top: "100%" }),
            }}
          >
            {menuItems}
          </div>
        </>
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
  onStarToggle,
  onPinToggle,
  onDeleteFolder,
  onRenameFolder,
  selectionMode,
  selectedIds,
  onToggleSelect,
  isSynced,
}: {
  folder: FolderType;
  notes: Note[];
  activeNoteId: string | null;
  onNoteClick: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  onStarToggle?: (id: string, starred: boolean) => void;
  onPinToggle?: (id: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  isSynced?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    const noteId = e.dataTransfer.getData("text/note-id") || e.dataTransfer.getData("text/plain");
    if (noteId && onMoveNoteToFolder) {
      onMoveNoteToFolder(noteId, folder.id);
    }
  };

  return (
    <div
      data-file-item
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderRadius: 6,
        border: dragOver ? "1.5px dashed var(--color-obsidian-accent)" : "1.5px dashed transparent",
        transition: "border 0.15s, background 0.15s",
      }}
    >
      {renaming ? (
        <div className="flex items-center gap-1.5 px-3 py-1">
          <Folder size={11} style={{ color: "var(--color-obsidian-muted-text)" }} />
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              if (renameValue.trim() && renameValue.trim() !== folder.name) {
                onRenameFolder?.(folder.id, renameValue.trim());
              }
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (renameValue.trim() && renameValue.trim() !== folder.name) {
                  onRenameFolder?.(folder.id, renameValue.trim());
                }
                setRenaming(false);
              } else if (e.key === "Escape") {
                setRenameValue(folder.name);
                setRenaming(false);
              }
            }}
            className="flex-1 bg-transparent outline-none text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-obsidian-text)", borderBottom: "1px solid var(--color-obsidian-accent)" }}
          />
        </div>
      ) : (
        <div
          className="group/folder w-full flex items-center gap-1.5 px-3 py-1 text-xs font-medium uppercase tracking-wider hover:opacity-80 transition-all cursor-pointer"
          style={{
            color: "var(--color-obsidian-muted-text)",
            background: dragOver ? "var(--color-obsidian-selection)" : "transparent",
            borderRadius: 4,
          }}
          onClick={() => setOpen((v) => !v)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <Folder size={11} />
          <span className="flex-1 truncate">{folder.name}</span>
          {isSynced && <Cloud size={10} style={{ color: "var(--color-obsidian-accent)", opacity: 0.7, flexShrink: 0 }} />}
          <span className="opacity-60 group-hover/folder:hidden">{folderNotes.length}</span>
          <div className="hidden group-hover/folder:flex items-center gap-0.5">
            <button
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: "#ef4444" }}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              aria-label="Delete folder"
            >
              <Trash2 size={11} />
            </button>
            <button
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
              onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
              aria-label="More options"
            >
              <MoreHorizontal size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Folder context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 rounded-lg shadow-lg border py-1 min-w-[140px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: "var(--color-obsidian-surface)",
              borderColor: "var(--color-obsidian-border)",
            }}
          >
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80 transition-colors"
              style={{ color: "var(--color-obsidian-text)" }}
              onClick={() => {
                setRenameValue(folder.name);
                setRenaming(true);
                setContextMenu(null);
              }}
            >
              <Pencil size={12} /> Rename
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80 transition-colors"
              style={{ color: "#ef4444" }}
              onClick={() => {
                setConfirmDelete(true);
                setContextMenu(null);
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setConfirmDelete(false)}>
            <div
              className="rounded-lg shadow-xl p-4 max-w-xs w-full mx-4"
              style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "var(--color-obsidian-text)" }}>Delete &ldquo;{folder.name}&rdquo;?</p>
              <p className="text-xs mb-3" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {folderNotes.length > 0 ? `${folderNotes.length} note${folderNotes.length > 1 ? "s" : ""} will be moved to the root folder.` : "This folder is empty."}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-3 py-1 rounded text-xs"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                  onClick={() => setConfirmDelete(false)}
                >Cancel</button>
                <button
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ background: "#ef4444", color: "#fff" }}
                  onClick={() => {
                    onDeleteFolder?.(folder.id);
                    setConfirmDelete(false);
                  }}
                >Delete</button>
              </div>
            </div>
          </div>
        </>
      )}
      {open &&
        folderNotes.map((note) => (
          <FileTreeItem
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            onClick={() => onNoteClick(note.id)}
            onDelete={onDeleteNote}
            onRename={onRenameNote}
            onStarToggle={onStarToggle}
            onPinToggle={onPinToggle}
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
  onDeleteFolder,
  onRenameFolder,
  onMoveNoteToFolder,
  isMobile = false,
  onPermanentlyDelete,
  onRestoreNote,
  onTogglePin,
  vaultPath,
  selectAllRef,
  webVaults,
  activeWebVaultId,
  onCreateWebVault,
  onSwitchWebVault,
  onOpenVault,
  onCreateVault,
}: SidebarProps) {
  const { notes: allNotes, activeNoteId, sidebarView, searchQuery, syncStatus, user, folders, syncedFolderIds } = state;
  // Filter out trashed notes for normal views
  const notes = allNotes.filter((n) => !n.trashed);
  const trashedNotes = allNotes.filter((n) => n.trashed);
  const [newNoteMenuOpen, setNewNoteMenuOpen] = useState(false);
  const [newNoteMenuRect, setNewNoteMenuRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [explorerMenu, setExplorerMenu] = useState<{ x: number; y: number } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("voltex-sort-mode") : null;
      return (saved as SortMode) || "modified";
    } catch { return "modified"; }
  });
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [newVaultName, setNewVaultName] = useState("");
  const allTags = getAllTags(notes);

  // Expose selectAll to parent via ref
  React.useEffect(() => {
    if (selectAllRef && "current" in selectAllRef) {
      (selectAllRef as React.MutableRefObject<{ selectAll: () => void } | null>).current = {
        selectAll: () => {
          setSelectionMode(true);
          setSelectedIds(new Set(notes.map((n) => n.id)));
        },
      };
    }
  }, [selectAllRef, notes]);

  // ── Root-level drop zone: move notes out of folders back to root ──
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setRootDragOver(true);
  };
  const handleRootDragLeave = () => setRootDragOver(false);
  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    // External file drop from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const textFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.name.endsWith(".md") || file.name.endsWith(".txt") || file.type.startsWith("text/")
      );
      if (textFiles.length === 0) return;
      Promise.all(
        textFiles.map(
          (file) =>
            new Promise<Note>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const content = reader.result as string;
                const title = file.name.replace(/\.(md|txt)$/, "");
                const now = new Date().toISOString().split("T")[0];
                resolve({
                  id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  title,
                  content,
                  tags: [],
                  folder: "root",
                  createdAt: now,
                  updatedAt: now,
                  starred: false,
                  wordCount: 0,
                  type: "markdown",
                });
              };
              reader.readAsText(file);
            })
        )
      ).then((importedNotes) => {
        if (importedNotes.length > 0) {
          onStateChange({
            notes: [...allNotes, ...importedNotes],
            activeNoteId: importedNotes[0].id,
            openNoteIds: [...state.openNoteIds, ...importedNotes.map((n) => n.id)],
          });
        }
      });
      return;
    }
    // Internal note drag — move to root
    const noteId = e.dataTransfer.getData("text/note-id");
    if (noteId && onMoveNoteToFolder) {
      onMoveNoteToFolder(noteId, "root");
    }
  };

  // Sort notes helper
  const sortNotes = (list: Note[]) => {
    const pinned = list.filter((n) => n.pinned);
    const unpinned = list.filter((n) => !n.pinned);
    const sorter = (a: Note, b: Note) => {
      switch (sortMode) {
        case "modified": return (b.updatedAt || "").localeCompare(a.updatedAt || "");
        case "created": return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "title-asc": return a.title.localeCompare(b.title);
        case "title-desc": return b.title.localeCompare(a.title);
        default: return 0;
      }
    };
    return [...pinned.sort(sorter), ...unpinned.sort(sorter)];
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Move ${count} note${count > 1 ? "s" : ""} to Trash?`)) return;
    selectedIds.forEach((id) => onDeleteNote(id));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleStarToggle = (id: string, starred: boolean) => {
    onStateChange({
      notes: notes.map((n) => n.id === id ? { ...n, starred } : n),
    });
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
                mainView: id === "graph" ? "graph" : id === "canvas" ? "canvas" : "editor",
              })
            }
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)] focus-visible:outline-none"
            style={{
              color: sidebarView === id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
              background: sidebarView === id ? "color-mix(in srgb, var(--color-obsidian-accent) 15%, transparent)" : "transparent",
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
          {/* Vault picker (web) or title */}
          {sidebarView === "files" && webVaults && webVaults.length > 0 && onSwitchWebVault ? (
            <div className="relative">
              <button
                onClick={() => setVaultPickerOpen((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                <FolderOpen size={12} />
                {webVaults.find(v => v.id === activeWebVaultId)?.name || "Select Vault"}
                {vaultPickerOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {vaultPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[999]" onClick={() => { setVaultPickerOpen(false); setNewVaultName(""); }} />
                  <div
                    className="absolute left-0 top-full mt-1 z-[1000] w-52 rounded-lg overflow-hidden shadow-xl"
                    style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
                  >
                    <div className="px-2 py-1.5" style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
                      <span className="text-xs font-medium" style={{ color: "var(--color-obsidian-muted-text)" }}>Vaults</span>
                    </div>
                    {webVaults.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { onSwitchWebVault(v.id); setVaultPickerOpen(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                        style={{
                          color: v.id === activeWebVaultId ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)",
                          background: v.id === activeWebVaultId ? "color-mix(in srgb, var(--color-obsidian-accent) 10%, transparent)" : "transparent",
                        }}
                      >
                        <FolderOpen size={11} />
                        {v.name}
                        {v.id === activeWebVaultId && <Check size={11} style={{ marginLeft: "auto", opacity: 0.7 }} />}
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid var(--color-obsidian-border)" }}>
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <input
                          value={newVaultName}
                          onChange={(e) => setNewVaultName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newVaultName.trim() && onCreateWebVault) {
                              onCreateWebVault(newVaultName.trim());
                              setNewVaultName("");
                              setVaultPickerOpen(false);
                            }
                            if (e.key === "Escape") { setNewVaultName(""); setVaultPickerOpen(false); }
                          }}
                          placeholder="New vault name…"
                          className="flex-1 bg-transparent outline-none text-xs"
                          style={{ color: "var(--color-obsidian-text)" }}
                        />
                        <button
                          onClick={() => {
                            if (newVaultName.trim() && onCreateWebVault) {
                              onCreateWebVault(newVaultName.trim());
                              setNewVaultName("");
                              setVaultPickerOpen(false);
                            }
                          }}
                          className="p-1 rounded hover:bg-white/10"
                          style={{ color: "var(--color-obsidian-accent)" }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : sidebarView === "files" && onOpenVault ? (
            <div className="relative">
              <button
                onClick={() => setVaultPickerOpen((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                <FolderOpen size={12} />
                {vaultPath ? vaultPath.replace(/\\/g, "/").split("/").pop() || "Vault" : "Vault"}
                {vaultPickerOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {vaultPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[999]" onClick={() => setVaultPickerOpen(false)} />
                  <div
                    className="absolute left-0 top-full mt-1 z-[1000] w-52 rounded-lg overflow-hidden shadow-xl"
                    style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
                  >
                    <button
                      onClick={() => { onOpenVault(); setVaultPickerOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-obsidian-text)" }}
                    >
                      <FolderOpen size={12} />
                      Open Vault…
                    </button>
                    {onCreateVault && (
                      <button
                        onClick={() => { onCreateVault(); setVaultPickerOpen(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)", borderTop: "1px solid var(--color-obsidian-border)" }}
                      >
                        <Plus size={12} />
                        Create New Vault…
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              {sidebarView === "files" ? (vaultPath ? vaultPath.replace(/\\/g, "/").split("/").pop() || "Explorer" : "Explorer")
                : sidebarView === "search" ? "Search"
                : sidebarView === "tags" ? "Tags"
                : sidebarView === "bookmarks" ? "Bookmarks"
                : sidebarView === "trash" ? "Trash"
                : sidebarView === "marketplace" ? "Marketplace"
                : sidebarView === "canvas" ? "Canvas"
                : "Graph"}
            </span>
          )}
          <div className="flex items-center gap-1">
            {sidebarView === "files" && (
              <>
              <button
                onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: selectionMode ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}
                aria-label={selectionMode ? "Exit selection" : "Select files"}
                title={selectionMode ? "Exit selection" : "Select files"}
              >
                <CheckSquare size={14} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setSortMenuOpen((v) => !v)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                  aria-label="Sort notes"
                  title="Sort notes"
                >
                  <ArrowUpDown size={14} />
                </button>
                {sortMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[999]" onClick={() => setSortMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-full mt-1 z-[1000] w-44 rounded-lg overflow-hidden shadow-xl"
                      style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
                    >
                      {([
                        { key: "modified" as SortMode, label: "Date modified", icon: Clock },
                        { key: "created" as SortMode, label: "Date created", icon: Clock },
                        { key: "title-asc" as SortMode, label: "Title A → Z", icon: ArrowDownAZ },
                        { key: "title-desc" as SortMode, label: "Title Z → A", icon: ArrowUpAZ },
                      ]).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: sortMode === key ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)" }}
                          onClick={() => { setSortMode(key); setSortMenuOpen(false); try { localStorage.setItem("voltex-sort-mode", key); } catch { /* ignore */ } }}
                        >
                          <Icon size={11} /> {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              </>
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
                aria-label="Exit selection mode"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Sync badge — only show when user is signed in or actively syncing */}
        {(user || syncStatus !== "offline") && <SyncBadge status={syncStatus} />}

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* Files */}
          {sidebarView === "files" && (
            <div
              className="flex flex-col gap-1 relative"
              style={{ minHeight: "100%" }}
              onContextMenu={(e) => {
                if ((e.target as HTMLElement).closest("[data-file-item]")) return;
                e.preventDefault();
                setExplorerMenu({ x: e.clientX, y: e.clientY });
              }}
            >
              {/* Vault empty state — Electron, no vault loaded yet */}
              {onOpenVault && !vaultPath && (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <FolderOpen size={40} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.3 }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>No vault open</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      Open a folder of Markdown files or create a brand-new vault.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={onOpenVault}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                    >
                      <FolderOpen size={14} /> Open Folder…
                    </button>
                    {onCreateVault && (
                      <button
                        onClick={onCreateVault}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)" }}
                      >
                        <Plus size={14} /> Create New Vault…
                      </button>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                    You can also drag &amp; drop a folder here
                  </p>
                </div>
              )}
              {/* Explorer context menu */}
              {explorerMenu && (
                <>
                  <div className="fixed inset-0 z-[999]" onClick={() => setExplorerMenu(null)} onContextMenu={(e) => { e.preventDefault(); setExplorerMenu(null); }} />
                  <div
                    className="fixed z-[1000] w-48 rounded-lg overflow-hidden shadow-xl"
                    style={{
                      background: "var(--color-obsidian-surface)",
                      border: "1px solid var(--color-obsidian-border)",
                      left: Math.min(explorerMenu.x, (typeof window !== "undefined" ? window.innerWidth : 400) - 200),
                      top: Math.min(explorerMenu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 250),
                    }}
                  >
                    <button
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-obsidian-text)" }}
                      onClick={() => { onNewNote("markdown"); setExplorerMenu(null); }}
                    >
                      <FileText size={11} /> New Note
                    </button>
                    {state.installedPluginIds?.includes("excalidraw") && (
                      <button
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)" }}
                        onClick={() => { onNewNote("drawing"); setExplorerMenu(null); }}
                      >
                        <Pencil size={11} /> New Drawing
                      </button>
                    )}
                    <button
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-obsidian-text)" }}
                      onClick={() => { onNewNote("daily"); setExplorerMenu(null); }}
                    >
                      <CalendarDays size={11} /> New Daily Note
                    </button>
                    {state.installedPluginIds?.includes("obsidian-kanban") && (
                      <button
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)" }}
                        onClick={() => { onNewNote("kanban"); setExplorerMenu(null); }}
                      >
                        <LayoutGrid size={11} /> New Kanban Board
                      </button>
                    )}
                    <div style={{ borderTop: "1px solid var(--color-obsidian-border)", margin: "2px 0" }} />
                    <button
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-obsidian-text)" }}
                      onClick={() => { setCreatingFolder(true); setExplorerMenu(null); }}
                    >
                      <FolderPlus size={11} /> New Folder
                    </button>
                  </div>
                </>
              )}              {/* New folder input */}
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
                  onStarToggle={handleStarToggle}
                  onPinToggle={onTogglePin}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFolder={onRenameFolder}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  isSynced={folder.synced || syncedFolderIds?.includes(folder.id)}
                />
              ))}
              {/* Root-level notes (no folder) — also a drop zone */}
              <div
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
                style={{
                  borderRadius: 6,
                  border: rootDragOver ? "1.5px dashed var(--color-obsidian-accent)" : "1.5px dashed transparent",
                  background: rootDragOver ? "var(--color-obsidian-selection-sm)" : "transparent",
                  transition: "border 0.15s, background 0.15s",
                  minHeight: 32,
                  padding: rootDragOver ? 4 : 0,
                }}
              >
                {rootDragOver && notes.filter((n) => n.folder === "root" || !n.folder).length === 0 && (
                  <div className="flex items-center justify-center py-3 text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                    Drop here to move to root
                  </div>
                )}
                {sortNotes(notes.filter((n) => n.folder === "root" || !n.folder)).map((note) => (
                  <FileTreeItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    onClick={() => onNoteOpen ? onNoteOpen(note.id) : onStateChange({ activeNoteId: note.id, mainView: "editor" })}
                    onDelete={onDeleteNote}
                    onRename={onRenameNote}
                    onStarToggle={handleStarToggle}
                    onPinToggle={onTogglePin}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(note.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
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
                    background: activeNoteId === note.id ? "color-mix(in srgb, var(--color-obsidian-accent) 13%, transparent)" : "transparent",
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
                  className="flex items-center justify-between px-2 py-2 min-h-[44px] rounded-md hover:bg-white/5 transition-colors text-left"
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
                  className="flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-md hover:bg-white/5 transition-colors text-left"
                  style={{ color: activeNoteId === note.id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)" }}
                >
                  <Star size={11} style={{ color: "#f9e2af", flexShrink: 0 }} />
                  <span className="text-xs truncate">{note.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Trash */}
          {sidebarView === "trash" && (
            <div className="flex flex-col gap-0.5 px-2">
              {trashedNotes.length === 0 && (
                <p className="text-xs px-2 py-3" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  Trash is empty.
                </p>
              )}
              {trashedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-md hover:bg-white/5 transition-colors group"
                  style={{ color: "var(--color-obsidian-text)" }}
                >
                  <NoteTypeIcon type={note.type} size={11} />
                  <span className="text-xs truncate flex-1">{note.title}</span>
                  <span className="text-[10px] opacity-40 shrink-0 hidden group-hover:inline">
                    {note.trashedAt ? new Date(note.trashedAt).toLocaleDateString() : ""}
                  </span>
                  <button
                    onClick={() => onRestoreNote?.(note.id)}
                    className="p-1.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-obsidian-accent-soft)" }}
                    aria-label="Restore note"
                    title="Restore"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Permanently delete "${note.title}"? This cannot be undone.`)) {
                        onPermanentlyDelete?.(note.id);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#f38ba8" }}
                    aria-label="Delete permanently"
                    title="Delete permanently"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {trashedNotes.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Permanently delete ${trashedNotes.length} note${trashedNotes.length === 1 ? "" : "s"}? This cannot be undone.`)) {
                      trashedNotes.forEach((n) => onPermanentlyDelete?.(n.id));
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 mt-2 rounded-lg text-xs hover:opacity-80 transition-opacity"
                  style={{ background: "rgba(243,139,168,0.1)", color: "#f38ba8", border: "1px solid rgba(243,139,168,0.2)" }}
                >
                  <Trash2 size={11} /> Empty trash
                </button>
              )}
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

          {/* Canvas files */}
          {sidebarView === "canvas" && (() => {
            const canvasNotes = allNotes.filter((n) => n.type === "canvas" && !n.trashed);
            return canvasNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                <Layers size={28} style={{ color: "#74c7ec", opacity: 0.7 }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
                  No canvases yet
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  Create a visual board to arrange notes, text cards, and connections.
                </p>
                <button
                  onClick={() => onNewNote("canvas")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: "#74c7ec", color: "#1e1e2e" }}
                >
                  <Plus size={13} /> New Canvas
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 px-1">
                <button
                  onClick={() => onNewNote("canvas")}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs hover:bg-white/5 transition-colors mb-1"
                  style={{ color: "#74c7ec" }}
                >
                  <Plus size={13} /> New Canvas
                </button>
                {canvasNotes.map((cn) => {
                  let cardCount = 0;
                  try { cardCount = JSON.parse(cn.content)?.cards?.length || 0; } catch { /* ignore */ }
                  return (
                    <button
                      key={cn.id}
                      onClick={() => {
                        onStateChange({ activeNoteId: cn.id, openNoteIds: [...(state.openNoteIds || []), cn.id], mainView: "canvas" } as Partial<AppState>);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                      style={{
                        background: activeNoteId === cn.id ? "rgba(116,199,236,0.12)" : "transparent",
                        border: activeNoteId === cn.id ? "1px solid rgba(116,199,236,0.3)" : "1px solid transparent",
                      }}
                    >
                      <Layers size={14} style={{ color: "#74c7ec", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--color-obsidian-text)" }}>
                          {cn.title}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--color-obsidian-muted-text)" }}>
                          {cardCount} card{cardCount !== 1 ? "s" : ""} · {new Date(cn.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
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
