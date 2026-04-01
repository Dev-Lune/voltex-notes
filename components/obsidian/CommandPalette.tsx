"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, FileText, Share2, Settings, Plus, Star, Tag,
  Bookmark, Edit3, Eye, Columns2, ChevronRight, Command
} from "lucide-react";
import { Note } from "./data";

interface CommandPaletteProps {
  notes: Note[];
  onClose: () => void;
  onNoteOpen: (id: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  onOpenGraph: () => void;
  onViewMode?: (mode: "editor" | "split" | "preview") => void;
  onSidebarView?: (view: "files" | "search" | "tags" | "bookmarks" | "trash" | "graph" | "marketplace") => void;
}

interface CommandItem {
  id: string;
  type: "note" | "command";
  icon: React.ReactNode;
  label: string;
  description?: string;
  action: () => void;
  kbd?: string;
}

export default function CommandPalette({
  notes,
  onClose,
  onNoteOpen,
  onNewNote,
  onOpenSettings,
  onOpenGraph,
  onViewMode,
  onSidebarView,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const systemCommands: CommandItem[] = [
    {
      id: "new-note",
      type: "command",
      icon: <Plus size={14} />,
      label: "New note",
      description: "Create a blank note",
      action: () => { onNewNote(); onClose(); },
      kbd: "Ctrl+N",
    },
    {
      id: "open-graph",
      type: "command",
      icon: <Share2 size={14} />,
      label: "Open Graph View",
      description: "Visualize note connections",
      action: () => { onOpenGraph(); onClose(); },
      kbd: "Ctrl+G",
    },
    {
      id: "open-settings",
      type: "command",
      icon: <Settings size={14} />,
      label: "Open Settings",
      description: "Preferences, plugins, appearance",
      action: () => { onOpenSettings(); onClose(); },
    },
    {
      id: "view-edit",
      type: "command",
      icon: <Edit3 size={14} />,
      label: "Switch to Edit mode",
      action: () => { onViewMode?.("editor"); onClose(); },
    },
    {
      id: "view-preview",
      type: "command",
      icon: <Eye size={14} />,
      label: "Switch to Preview mode",
      action: () => { onViewMode?.("preview"); onClose(); },
    },
    {
      id: "view-split",
      type: "command",
      icon: <Columns2 size={14} />,
      label: "Toggle Split view",
      action: () => { onViewMode?.("split"); onClose(); },
    },
    {
      id: "starred",
      type: "command",
      icon: <Star size={14} />,
      label: "Show Bookmarks",
      action: () => { onSidebarView?.("bookmarks"); onClose(); },
    },
    {
      id: "tags",
      type: "command",
      icon: <Tag size={14} />,
      label: "Browse Tags",
      action: () => { onSidebarView?.("tags"); onClose(); },
    },
  ];

  const noteItems: CommandItem[] = notes.map((n) => ({
    id: n.id,
    type: "note",
    icon: <FileText size={14} />,
    label: n.title,
    description: n.tags.map((t) => `#${t}`).join(" ") || n.folder,
    action: () => { onNoteOpen(n.id); onClose(); },
  }));

  const q = query.trim().toLowerCase();
  const filtered = q
    ? [...systemCommands, ...noteItems].filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      )
    : [...systemCommands, ...noteItems.slice(0, 8)];

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selectedIdx]?.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const noteItems2 = filtered.filter((f) => f.type === "note");
  const commandItems = filtered.filter((f) => f.type === "command");
  const groups: { label: string; items: CommandItem[] }[] = [];
  if (commandItems.length) groups.push({ label: "Commands", items: commandItems });
  if (noteItems2.length) groups.push({ label: "Notes", items: noteItems2 });

  let runningIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <Command size={16} style={{ color: "var(--color-obsidian-accent)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes and commands…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-obsidian-text)" }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search
                size={24}
                className="mx-auto mb-2 opacity-30"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              />
              <p className="text-sm" style={{ color: "var(--color-obsidian-muted-text)" }}>
                No results for &quot;{query}&quot;
              </p>
            </div>
          )}
          {groups.map(({ label, items }) => (
            <div key={label}>
              <div
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{
                  color: "var(--color-obsidian-muted-text)",
                  borderBottom: "1px solid var(--color-obsidian-border)",
                  background: "var(--color-obsidian-bg)",
                }}
              >
                {label}
              </div>
              {items.map((item) => {
                const idx = runningIdx++;
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={item.id}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{
                      background: isSelected
                        ? "rgba(124,106,247,0.18)"
                        : "transparent",
                      color: "var(--color-obsidian-text)",
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={item.action}
                  >
                    <span
                      className="shrink-0"
                      style={{
                        color: isSelected
                          ? "var(--color-obsidian-accent-soft)"
                          : "var(--color-obsidian-muted-text)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{item.label}</span>
                      {item.description && (
                        <span
                          className="block text-xs truncate"
                          style={{ color: "var(--color-obsidian-muted-text)" }}
                        >
                          {item.description}
                        </span>
                      )}
                    </span>
                    {item.kbd && (
                      <kbd
                        className="shrink-0 text-xs px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: "var(--color-obsidian-bg)",
                          border: "1px solid var(--color-obsidian-border)",
                          color: "var(--color-obsidian-muted-text)",
                        }}
                      >
                        {item.kbd}
                      </kbd>
                    )}
                    {isSelected && (
                      <ChevronRight
                        size={12}
                        style={{ color: "var(--color-obsidian-accent)", flexShrink: 0 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 text-xs"
          style={{
            borderTop: "1px solid var(--color-obsidian-border)",
            color: "var(--color-obsidian-muted-text)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <div className="flex-1" />
          <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
