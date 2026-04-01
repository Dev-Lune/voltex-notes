"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Eye, Edit3, Columns2, Star, StarOff, X, Plus, Share2,
  MoreHorizontal, Bold, Italic, Code, Link, List, ListOrdered,
  Heading1, Heading2, Quote, Minus, CheckSquare, Hash, Pencil,
  CalendarDays, LayoutGrid, Search, Replace, ChevronDown, ChevronUp,
  CaseSensitive, Regex, FileText, Copy, Download, Clipboard, Trash2,
  Table2, Check, Loader2
} from "lucide-react";
import { Note, AppState, countWords, NoteType } from "./data";
import MarkdownRenderer from "./MarkdownRenderer";
import ExcalidrawCanvas from "./ExcalidrawCanvas";

interface EditorProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
  onNoteClick: (id: string) => void;
  onNewNote: (type?: NoteType) => void;
  isMobile?: boolean;
}

// ─── Note type badge ──────────────────────────────────────────────────────────

function NoteTypeBadge({ type }: { type?: NoteType }) {
  const map: Record<NoteType, { label: string; color: string; icon: React.ElementType }> = {
    markdown: { label: "Markdown", color: "var(--color-obsidian-muted-text)", icon: Edit3 },
    drawing: { label: "Drawing", color: "#cba6f7", icon: Pencil },
    daily: { label: "Daily Note", color: "#f9e2af", icon: CalendarDays },
    kanban: { label: "Kanban", color: "#89b4fa", icon: LayoutGrid },
    table: { label: "Table", color: "#a6e3a1", icon: Edit3 },
  };
  const t = type ?? "markdown";
  const { label, color, icon: Icon } = map[t];
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      <Icon size={10} />
      {label}
    </div>
  );
}

// ─── Find & Replace Dialog ────────────────────────────────────────────────────

interface FindReplaceProps {
  content: string;
  onContentChange: (content: string) => void;
  onClose: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function FindReplaceDialog({ content, onContentChange, onClose, textareaRef }: FindReplaceProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState<Array<{ start: number; end: number }>>([]);

  // Find all matches
  useEffect(() => {
    if (!findText) {
      setMatches([]);
      setCurrentMatch(0);
      return;
    }

    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex ? new RegExp(findText, flags) : new RegExp(escapeRegex(findText), flags);
      const foundMatches: Array<{ start: number; end: number }> = [];
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(content)) !== null) {
        foundMatches.push({ start: match.index, end: match.index + match[0].length });
        if (!pattern.global) break;
      }

      setMatches(foundMatches);
      if (foundMatches.length > 0 && currentMatch >= foundMatches.length) {
        setCurrentMatch(0);
      }
    } catch {
      setMatches([]);
    }
  }, [findText, content, caseSensitive, useRegex, currentMatch]);

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const goToMatch = (index: number) => {
    if (matches.length === 0 || !textareaRef.current) return;
    const normalizedIndex = ((index % matches.length) + matches.length) % matches.length;
    setCurrentMatch(normalizedIndex);
    const match = matches[normalizedIndex];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(match.start, match.end);
    // Scroll to match
    const lines = content.substring(0, match.start).split("\n");
    const lineHeight = 24;
    textareaRef.current.scrollTop = Math.max(0, (lines.length - 5) * lineHeight);
  };

  const replaceOne = () => {
    if (matches.length === 0) return;
    const match = matches[currentMatch];
    const newContent = content.substring(0, match.start) + replaceText + content.substring(match.end);
    onContentChange(newContent);
  };

  const replaceAll = () => {
    if (!findText || matches.length === 0) return;
    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex ? new RegExp(findText, flags) : new RegExp(escapeRegex(findText), flags);
      const newContent = content.replace(pattern, replaceText);
      onContentChange(newContent);
    } catch {
      // Invalid regex
    }
  };

  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{
        background: "var(--color-obsidian-surface)",
        borderBottom: "1px solid var(--color-obsidian-border)",
      }}
    >
      {/* Find row */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{
            background: "var(--color-obsidian-bg)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <Search size={13} style={{ color: "var(--color-obsidian-muted-text)", flexShrink: 0 }} />
          <input
            autoFocus
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToMatch(currentMatch + (e.shiftKey ? -1 : 1));
              if (e.key === "Escape") onClose();
            }}
            placeholder="Find…"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--color-obsidian-text)" }}
          />
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : "No results"}
          </span>
        </div>

        {/* Options */}
        <button
          onClick={() => setCaseSensitive((v) => !v)}
          className="p-1.5 rounded transition-colors"
          style={{
            background: caseSensitive ? "rgba(124,106,247,0.2)" : "transparent",
            color: caseSensitive ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
          }}
          title="Case sensitive"
        >
          <CaseSensitive size={14} />
        </button>
        <button
          onClick={() => setUseRegex((v) => !v)}
          className="p-1.5 rounded transition-colors"
          style={{
            background: useRegex ? "rgba(124,106,247,0.2)" : "transparent",
            color: useRegex ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
          }}
          title="Use regex"
        >
          <Regex size={14} />
        </button>

        {/* Navigation */}
        <button
          onClick={() => goToMatch(currentMatch - 1)}
          disabled={matches.length === 0}
          className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => goToMatch(currentMatch + 1)}
          disabled={matches.length === 0}
          className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        >
          <ChevronDown size={14} />
        </button>

        {/* Toggle replace */}
        <button
          onClick={() => setShowReplace((v) => !v)}
          className="p-1.5 rounded transition-colors"
          style={{
            background: showReplace ? "rgba(124,106,247,0.2)" : "transparent",
            color: showReplace ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
          }}
          title="Toggle replace"
        >
          <Replace size={14} />
        </button>

        <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
          <X size={14} style={{ color: "var(--color-obsidian-muted-text)" }} />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
            }}
          >
            <Replace size={13} style={{ color: "var(--color-obsidian-muted-text)", flexShrink: 0 }} />
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") replaceOne();
                if (e.key === "Escape") onClose();
              }}
              placeholder="Replace…"
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--color-obsidian-text)" }}
            />
          </div>
          <button
            onClick={replaceOne}
            disabled={matches.length === 0}
            className="px-2 py-1 rounded text-xs font-medium disabled:opacity-30"
            style={{
              background: "var(--color-obsidian-accent)",
              color: "#fff",
            }}
          >
            Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={matches.length === 0}
            className="px-2 py-1 rounded text-xs font-medium disabled:opacity-30"
            style={{
              background: "rgba(124,106,247,0.2)",
              color: "var(--color-obsidian-accent-soft)",
            }}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hover Preview Popup ──────────────────────────────────────────────────────

interface HoverPreviewProps {
  title: string;
  notes: Note[];
  rect: DOMRect;
  onClose: () => void;
  onNoteClick: (id: string) => void;
}

function HoverPreview({ title, notes, rect, onClose, onNoteClick }: HoverPreviewProps) {
  const note = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
  const previewRef = useRef<HTMLDivElement>(null);

  // Position calculation
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (previewRef.current) {
      const previewRect = previewRef.current.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      // Adjust if would go off screen
      if (top + previewRect.height > window.innerHeight - 20) {
        top = rect.top - previewRect.height - 8;
      }
      if (left + previewRect.width > window.innerWidth - 20) {
        left = window.innerWidth - previewRect.width - 20;
      }

      setPosition({ top, left });
    }
  }, [rect]);

  if (!note) {
    return (
      <div
        ref={previewRef}
        className="fixed z-50 p-3 rounded-lg shadow-2xl max-w-xs"
        style={{
          top: position.top,
          left: position.left,
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
        }}
        onMouseLeave={onClose}
      >
        <p className="text-xs italic" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Note not found: {title}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className="fixed z-50 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: 320,
        maxHeight: 280,
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
      }}
      onMouseLeave={onClose}
    >
      <button
        onClick={() => onNoteClick(note.id)}
        className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
        style={{
          borderBottom: "1px solid var(--color-obsidian-border)",
          color: "var(--color-obsidian-link)",
          fontWeight: 600,
          fontSize: "0.85em",
        }}
      >
        <FileText size={13} />
        {note.title}
      </button>
      <div
        className="px-3 py-2 overflow-hidden pointer-events-none hover-preview-body"
        style={{
          fontSize: "0.78em",
          lineHeight: 1.5,
          maxHeight: 190,
        }}
      >
        <MarkdownRenderer
          content={(() => {
            // Strip leading heading that duplicates the title header
            const c = note.content.trimStart();
            const headingRe = /^#{1,6}\s+.*\n?/;
            const stripped = c.replace(headingRe, '');
            return stripped.slice(0, 500);
          })()}
          notes={notes}
          className="hover-preview-content"
        />
      </div>
      {note.tags.length > 0 && (
        <div
          className="px-3 py-1.5 flex flex-wrap gap-1"
          style={{ borderTop: "1px solid var(--color-obsidian-border)" }}
        >
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                background: "var(--color-obsidian-tag-bg)",
                color: "var(--color-obsidian-tag)",
                fontSize: "0.75em",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Link Autocomplete Dropdown ───────────────────────────────────────────────

interface LinkAutocompleteProps {
  notes: Note[];
  filter: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

function LinkAutocomplete({ notes, filter, position, onSelect, onClose }: LinkAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filtered = notes
    .filter((n) => n.title.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].title);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="fixed z-50 rounded-lg shadow-2xl overflow-hidden"
      style={{
        top: position.top + 24,
        left: position.left,
        minWidth: 200,
        maxWidth: 300,
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
      }}
    >
      {filtered.map((note, i) => (
        <button
          key={note.id}
          onClick={() => onSelect(note.title)}
          className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
          style={{
            background: i === selectedIndex ? "rgba(124,106,247,0.15)" : "transparent",
            color: i === selectedIndex ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-text)",
            fontSize: "0.85em",
          }}
        >
          <FileText size={12} style={{ color: "var(--color-obsidian-muted-text)", flexShrink: 0 }} />
          <span className="truncate">{note.title}</span>
          {note.type !== "markdown" && (
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded"
              style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-muted-text)" }}
            >
              {note.type}
            </span>
          )}
        </button>
      ))}
      <div
        className="px-3 py-1.5 text-xs border-t"
        style={{
          borderColor: "var(--color-obsidian-border)",
          color: "var(--color-obsidian-muted-text)",
          background: "var(--color-obsidian-bg)",
        }}
      >
        <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-obsidian-surface)" }}>Enter</kbd> to insert
      </div>
    </div>
  );
}

// ─── YAML Frontmatter Editor ──────────────────────────────────────────────────

interface FrontmatterField {
  key: string;
  value: string;
}

function parseFrontmatter(content: string): { fields: FrontmatterField[]; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fields: [], body: content };
  
  const yamlContent = match[1];
  const body = match[2];
  const fields: FrontmatterField[] = [];
  
  yamlContent.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      fields.push({ key, value });
    }
  });
  
  return { fields, body };
}

function FrontmatterEditor({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange: (content: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { fields, body } = parseFrontmatter(content);
  const hasFrontmatter = fields.length > 0;

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...fields];
    newFields[index] = { key, value };
    rebuildContent(newFields);
  };

  const addField = () => {
    const newFields = [...fields, { key: "key", value: "value" }];
    rebuildContent(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    rebuildContent(newFields);
  };

  const rebuildContent = (newFields: FrontmatterField[]) => {
    if (newFields.length === 0) {
      onContentChange(body);
    } else {
      const yaml = newFields.map((f) => `${f.key}: ${f.value}`).join("\n");
      onContentChange(`---\n${yaml}\n---\n${body}`);
    }
  };

  const createFrontmatter = () => {
    onContentChange(`---\ntitle: ${""}\ntags: []\ndate: ${new Date().toISOString().split("T")[0]}\n---\n${content}`);
  };

  if (!hasFrontmatter) {
    return (
      <button
        onClick={createFrontmatter}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs mb-4 transition-colors hover:bg-white/5"
        style={{
          color: "var(--color-obsidian-muted-text)",
          border: "1px dashed var(--color-obsidian-border)",
        }}
      >
        <Plus size={10} />
        Add frontmatter
      </button>
    );
  }

  return (
    <div
      className="mb-4 rounded-md overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/5"
        style={{ color: "var(--color-obsidian-muted-text)" }}
      >
        <span className="font-medium">Frontmatter ({fields.length} fields)</span>
        <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <ChevronDown size={12} />
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {fields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={field.key}
                onChange={(e) => updateField(i, e.target.value, field.value)}
                className="w-24 px-2 py-1 rounded text-xs bg-transparent outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-accent-soft)",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <span style={{ color: "var(--color-obsidian-muted-text)" }}>:</span>
              <input
                value={field.value}
                onChange={(e) => updateField(i, field.key, e.target.value)}
                className="flex-1 px-2 py-1 rounded text-xs bg-transparent outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <button
                onClick={() => removeField(i)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5 self-start"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <Plus size={10} />
            Add field
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  openNoteIds,
  notes,
  activeNoteId,
  onActivate,
  onClose,
}: {
  openNoteIds: string[];
  notes: Note[];
  activeNoteId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center overflow-x-auto shrink-0"
      style={{
        borderBottom: "1px solid var(--color-obsidian-border)",
        background: "var(--color-obsidian-bg)",
        minHeight: 36,
      }}
    >
      {openNoteIds.map((id) => {
        const note = notes.find((n) => n.id === id);
        const isActive = id === activeNoteId;
        return (
          <div
            key={id}
            className="group flex items-center gap-1.5 px-3 py-2 cursor-pointer shrink-0 transition-colors"
            style={{
              borderRight: "1px solid var(--color-obsidian-border)",
              background: isActive ? "var(--color-obsidian-surface)" : "transparent",
              borderBottom: isActive ? "2px solid var(--color-obsidian-accent)" : "2px solid transparent",
              color: isActive ? "var(--color-obsidian-text)" : "var(--color-obsidian-muted-text)",
              maxWidth: 180,
            }}
            onClick={() => onActivate(id)}
          >
            {note?.type === "drawing" && <Pencil size={10} style={{ color: "#cba6f7", flexShrink: 0 }} />}
            {note?.type === "daily" && <CalendarDays size={10} style={{ color: "#f9e2af", flexShrink: 0 }} />}
            <span className="text-xs truncate">{note?.title ?? "Untitled"}</span>
            <button
              className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity rounded"
              onClick={(e) => { e.stopPropagation(); onClose(id); }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  viewMode,
  onViewMode,
  note,
  onNoteChange,
  onNewNote,
  onDeleteNote,
  onDuplicateNote,
  onToggleFindReplace,
  onInsertText,
  onShareNote,
  shareStatus,
  isLoggedIn,
}: {
  viewMode: AppState["viewMode"];
  onViewMode: (m: AppState["viewMode"]) => void;
  note: Note | null;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
  onNewNote: (type?: NoteType) => void;
  onDeleteNote?: (id: string) => void;
  onDuplicateNote?: (id: string) => void;
  onToggleFindReplace?: () => void;
  onInsertText?: (text: string) => void;
  onShareNote?: (id: string) => void;
  shareStatus?: "idle" | "sharing" | "copied";
  isLoggedIn?: boolean;
}) {
  const isDrawing = note?.type === "drawing";
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <div
      className="flex items-center gap-1 px-3 py-1 shrink-0"
      style={{
        borderBottom: "1px solid var(--color-obsidian-border)",
        background: "var(--color-obsidian-bg)",
      }}
    >
      {/* View mode — only for non-drawing notes */}
      {!isDrawing && (
        <>
          <div
            className="flex items-center rounded-md overflow-hidden"
            style={{ border: "1px solid var(--color-obsidian-border)" }}
          >
            {(
              [
                { mode: "editor", icon: Edit3, title: "Edit (Ctrl+E)" },
                { mode: "split", icon: Columns2, title: "Split view" },
                { mode: "preview", icon: Eye, title: "Preview (Ctrl+E)" },
              ] as const
            ).map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                onClick={() => onViewMode(mode)}
                title={title}
                className="px-2 py-1 transition-colors"
                style={{
                  background: viewMode === mode ? "var(--color-obsidian-accent)" : "transparent",
                  color: viewMode === mode ? "#fff" : "var(--color-obsidian-muted-text)",
                }}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
          <div className="h-4 w-px" style={{ background: "var(--color-obsidian-border)" }} />
        </>
      )}

      {/* Note type badge */}
      {note && <NoteTypeBadge type={note.type} />}

      {/* Formatting buttons — markdown editor only */}
      {!isDrawing && viewMode !== "preview" && note && (
        <>
          <div className="h-4 w-px" style={{ background: "var(--color-obsidian-border)" }} />
          {[
            { icon: Bold, title: "Bold (Ctrl+B)" },
            { icon: Italic, title: "Italic (Ctrl+I)" },
            { icon: Code, title: "Inline code" },
          ].map(({ icon: Icon, title }) => (
            <button
              key={title}
              title={title}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <Icon size={13} />
            </button>
          ))}
          <div className="h-4 w-px" style={{ background: "var(--color-obsidian-border)" }} />
          {[
            { icon: Heading1, title: "Heading 1" },
            { icon: Heading2, title: "Heading 2" },
            { icon: List, title: "Bullet list" },
            { icon: ListOrdered, title: "Numbered list" },
            { icon: CheckSquare, title: "Task list" },
            { icon: Quote, title: "Blockquote" },
            { icon: Minus, title: "Horizontal rule" },
            { icon: Link, title: "Insert link" },
            { icon: Hash, title: "Add tag" },
          ].map(({ icon: Icon, title }) => (
            <button
              key={title}
              title={title}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <Icon size={13} />
            </button>
          ))}
          <div className="h-4 w-px" style={{ background: "var(--color-obsidian-border)" }} />
          <button
            title="Insert table"
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            onClick={() => onInsertText?.("\n| Header | Header | Header |\n| ------ | ------ | ------ |\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n")}
          >
            <Table2 size={13} />
          </button>
        </>
      )}

      <div className="flex-1" />

      {note && (
        <>
          <button
            onClick={() => onNoteChange(note.id, { starred: !note.starred })}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: note.starred ? "#f9e2af" : "var(--color-obsidian-muted-text)" }}
            title={note.starred ? "Remove bookmark" : "Bookmark"}
          >
            {note.starred ? <Star size={13} /> : <StarOff size={13} />}
          </button>
          {isLoggedIn && (
            <button
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: shareStatus === "copied" ? "#a6e3a1" : shareStatus === "sharing" ? "var(--color-obsidian-accent)" : "var(--color-obsidian-muted-text)" }}
              title={shareStatus === "copied" ? "Link copied!" : shareStatus === "sharing" ? "Sharing…" : "Share note"}
              onClick={() => note && shareStatus !== "sharing" && onShareNote?.(note.id)}
              disabled={shareStatus === "sharing"}
            >
              {shareStatus === "copied" ? <Check size={13} /> : shareStatus === "sharing" ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: moreMenuOpen ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}
              title="More options"
            >
              <MoreHorizontal size={13} />
            </button>
            {moreMenuOpen && (
              <>
                <div className="fixed inset-0 z-[998]" onClick={() => setMoreMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-[999] w-48 rounded-lg overflow-hidden shadow-xl"
                  style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
                >
                  {!isDrawing && (
                    <button
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-obsidian-text)" }}
                      onClick={() => { setMoreMenuOpen(false); onToggleFindReplace?.(); }}
                    >
                      <Search size={11} /> Find & Replace
                    </button>
                  )}
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-obsidian-text)" }}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (note) onDuplicateNote?.(note.id);
                    }}
                  >
                    <Copy size={11} /> Duplicate note
                  </button>
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-obsidian-text)" }}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (note) {
                        const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${note.title}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                  >
                    <Download size={11} /> Export as Markdown
                  </button>
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-obsidian-text)" }}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (note) navigator.clipboard.writeText(note.content);
                    }}
                  >
                    <Clipboard size={11} /> Copy content
                  </button>
                  <div className="my-0.5" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />
                  <button
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ color: "#f38ba8" }}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (note) onDeleteNote?.(note.id);
                    }}
                  >
                    <Trash2 size={11} /> Delete note
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => onNewNote()}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors"
        style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
        title="New note (Ctrl+N)"
      >
        <Plus size={12} />
        New
      </button>
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({ note, wordCount }: { note: Note | null; wordCount: number }) {
  if (!note || note.type === "drawing") return null;
  return (
    <div
      className="flex items-center gap-4 px-4 py-1 shrink-0 text-xs"
      style={{
        borderTop: "1px solid var(--color-obsidian-border)",
        background: "var(--color-obsidian-bg)",
        color: "var(--color-obsidian-muted-text)",
      }}
    >
      <span>{wordCount} words</span>
      <span>{note.content.length} chars</span>
      <span>{note.content.split("\n").length} lines</span>
      <div className="flex-1" />
      {note.tags.map((tag) => (
        <span
          key={tag}
          className="px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--color-obsidian-tag-bg)", color: "var(--color-obsidian-tag)", fontSize: "0.7rem" }}
        >
          #{tag}
        </span>
      ))}
      <span>Modified {note.updatedAt}</span>
    </div>
  );
}

// ─── Editor panes ─────────────────────────────────────────────────────────────

function EditorPane({
  note,
  notes,
  onNoteChange,
  onTitleChange,
  adjustHeight,
  textareaRef,
  onLinkAutocomplete,
  onCloseAutocomplete,
  preferences,
}: {
  note: Note;
  notes: Note[];
  onNoteChange: (v: string) => void;
  onTitleChange: (title: string) => void;
  adjustHeight: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onLinkAutocomplete?: (data: { filter: string; position: { top: number; left: number } } | null) => void;
  onCloseAutocomplete?: () => void;
  preferences?: AppState["preferences"];
}) {
  // Smart list continuation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart, value } = ta;
    
    // Smart list continuation on Enter
    if (e.key === "Enter" && !e.shiftKey) {
      const beforeCursor = value.substring(0, selectionStart);
      const currentLineStart = beforeCursor.lastIndexOf("\n") + 1;
      const currentLine = beforeCursor.substring(currentLineStart);
      
      // Check for list patterns
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s(.*)$/);
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      const taskMatch = currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s(.*)$/);
      
      let continuation = "";
      let shouldContinue = false;
      
      if (taskMatch) {
        const [, indent, bullet, content] = taskMatch;
        if (content.trim()) {
          continuation = `\n${indent}${bullet} [ ] `;
          shouldContinue = true;
        } else {
          // Empty task item - remove the line
          e.preventDefault();
          const newValue = value.substring(0, currentLineStart) + value.substring(selectionStart);
          onNoteChange(newValue);
          setTimeout(() => ta.setSelectionRange(currentLineStart, currentLineStart), 0);
          return;
        }
      } else if (bulletMatch) {
        const [, indent, bullet, content] = bulletMatch;
        if (content.trim()) {
          continuation = `\n${indent}${bullet} `;
          shouldContinue = true;
        } else {
          // Empty list item - remove the line
          e.preventDefault();
          const newValue = value.substring(0, currentLineStart) + value.substring(selectionStart);
          onNoteChange(newValue);
          setTimeout(() => ta.setSelectionRange(currentLineStart, currentLineStart), 0);
          return;
        }
      } else if (numberedMatch) {
        const [, indent, num, content] = numberedMatch;
        if (content.trim()) {
          continuation = `\n${indent}${parseInt(num) + 1}. `;
          shouldContinue = true;
        } else {
          // Empty list item - remove the line
          e.preventDefault();
          const newValue = value.substring(0, currentLineStart) + value.substring(selectionStart);
          onNoteChange(newValue);
          setTimeout(() => ta.setSelectionRange(currentLineStart, currentLineStart), 0);
          return;
        }
      }
      
      if (shouldContinue) {
        e.preventDefault();
        const newValue = value.substring(0, selectionStart) + continuation + value.substring(selectionStart);
        onNoteChange(newValue);
        const newPos = selectionStart + continuation.length;
        setTimeout(() => ta.setSelectionRange(newPos, newPos), 0);
        return;
      }
    }
    
    // Auto-pair brackets
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
    if (pairs[e.key]) {
      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(ta.selectionEnd);
      const selected = value.substring(selectionStart, ta.selectionEnd);
      const newValue = before + e.key + selected + pairs[e.key] + after;
      onNoteChange(newValue);
      setTimeout(() => ta.setSelectionRange(selectionStart + 1, selectionStart + 1 + selected.length), 0);
    }
  };

  // Link autocomplete detection
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    const { selectionStart, value } = ta;
    onNoteChange(value);
    adjustHeight();
    
    // Check for [[ pattern
    const beforeCursor = value.substring(0, selectionStart);
    const lastOpen = beforeCursor.lastIndexOf("[[");
    const lastClose = beforeCursor.lastIndexOf("]]");
    
    if (lastOpen > lastClose && lastOpen !== -1) {
      const filter = beforeCursor.substring(lastOpen + 2);
      if (!filter.includes("\n") && filter.length < 50) {
        // Get cursor position for dropdown
        const rect = ta.getBoundingClientRect();
        // Approximate position (simplified)
        const linesBefore = beforeCursor.split("\n").length;
        const top = rect.top + linesBefore * 24;
        const left = rect.left + 32;
        onLinkAutocomplete?.({ filter, position: { top, left } });
        return;
      }
    }
    onCloseAutocomplete?.();
  };

  const fontSize = preferences?.fontSize ?? 16;
  const showLineNumbers = preferences?.lineNumbers ?? false;
  const readableLength = preferences?.readableLineLength ?? true;
  const spellCheckEnabled = preferences?.spellCheck ?? false;
  const lines = note.content.split("\n");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto px-10 pt-10 pb-32" style={{ maxWidth: readableLength ? "48rem" : "none" }}>
        <input
          className="w-full bg-transparent outline-none text-3xl font-bold mb-1"
          style={{ color: "var(--color-obsidian-text)", lineHeight: 1.3 }}
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{ background: "var(--color-obsidian-tag-bg)", color: "var(--color-obsidian-tag)" }}
            >
              #{tag}
            </span>
          ))}
          <button
            className="text-xs px-2 py-0.5 rounded-full border border-dashed opacity-0 hover:opacity-60 transition-opacity focus:opacity-60"
            style={{ color: "var(--color-obsidian-muted-text)", borderColor: "var(--color-obsidian-border)" }}
          >
            + tag
          </button>
        </div>
        {/* YAML Frontmatter Editor */}
        <FrontmatterEditor
          content={note.content}
          onContentChange={onNoteChange}
        />
        <div className="flex">
          {showLineNumbers && (
            <div
              className="select-none pr-4 text-right shrink-0"
              style={{
                color: "var(--color-obsidian-muted-text)",
                fontSize: fontSize - 2,
                lineHeight: 1.8,
                opacity: 0.3,
                minWidth: "2.5em",
                fontVariantNumeric: "tabular-nums",
                paddingTop: 0,
              }}
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent outline-none resize-none"
            style={{
              color: "var(--color-obsidian-text)",
              fontSize,
              lineHeight: 1.8,
              minHeight: "60vh",
              caretColor: "var(--color-obsidian-accent-soft)",
              tabSize: preferences?.tabSize ?? 4,
            }}
            value={note.content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Start writing…"
            spellCheck={spellCheckEnabled}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewPane({
  note,
  notes,
  onWikilinkClick,
  onHoverLink,
  onHoverEnd,
}: {
  note: Note;
  notes?: Note[];
  onWikilinkClick: (title: string) => void;
  onHoverLink?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--color-obsidian-text)" }}>
          {note.title}
        </h1>
        <div className="flex flex-wrap gap-2 mb-6">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "var(--color-obsidian-tag-bg)", color: "var(--color-obsidian-tag)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
        <MarkdownRenderer
          content={note.content}
          notes={notes}
          onWikilinkClick={onWikilinkClick}
          onHoverLink={onHoverLink}
          onHoverEnd={onHoverEnd}
        />
      </div>
    </div>
  );
}

// ─── Daily note template renderer ────────────────────────────────────────────

function DailyNoteView({
  note,
  onNoteChange,
}: {
  note: Note;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
}) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays size={20} style={{ color: "#f9e2af" }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-obsidian-text)" }}>
              {today}
            </h1>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Daily Note</p>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {[
            { title: "Morning Intentions", placeholder: "What do you want to accomplish today?" },
            { title: "Notes & Thoughts", placeholder: "Stream of consciousness — write anything." },
            { title: "Evening Reflection", placeholder: "What did you learn? What went well?" },
          ].map(({ title, placeholder }) => (
            <div key={title}>
              <h3
                className="text-sm font-semibold mb-2 pb-1"
                style={{ color: "var(--color-obsidian-text)", borderBottom: "1px solid var(--color-obsidian-border)" }}
              >
                {title}
              </h3>
              <textarea
                placeholder={placeholder}
                rows={4}
                className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{ color: "var(--color-obsidian-text)", fontFamily: "var(--font-sans)" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban note view ────────────────────────────────────────────────────────

const KANBAN_COLS = [
  { id: "backlog", label: "Backlog", color: "#6c7086" },
  { id: "active", label: "In Progress", color: "#89b4fa" },
  { id: "review", label: "Review", color: "#f9e2af" },
  { id: "done", label: "Done", color: "#a6e3a1" },
];

function KanbanView() {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-6 h-full min-w-max">
        {KANBAN_COLS.map((col) => (
          <div
            key={col.id}
            className="w-60 flex flex-col rounded-xl overflow-hidden shrink-0"
            style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
                {col.label}
              </span>
              <div
                className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: `${col.color}20`, color: col.color }}
              >
                {col.id === "backlog" ? 3 : col.id === "active" ? 2 : col.id === "review" ? 1 : 4}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {Array.from({ length: col.id === "backlog" ? 3 : col.id === "active" ? 2 : col.id === "review" ? 1 : 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--color-obsidian-text)" }}>
                    {col.id === "backlog"
                      ? ["Research plugin API", "Design onboarding flow", "Write documentation"][i]
                      : col.id === "active"
                      ? ["Implement sync engine", "Fix graph rendering"][i]
                      : col.id === "review"
                      ? ["Code review PR #47"][i]
                      : ["Deploy v1.0", "Update changelog", "Close sprint", "Demo walkthrough"][i]}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div
                      className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                      style={{ background: "var(--color-obsidian-accent)", color: "#fff", fontSize: 8 }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      #task
                    </span>
                  </div>
                </div>
              ))}
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs w-full hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)", border: "1px dashed var(--color-obsidian-border)" }}
              >
                <Plus size={11} /> Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────��───────────────────

function EmptyState({ onNewNote, installedPluginIds }: { onNewNote: (type?: NoteType) => void; installedPluginIds: string[] }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(124,106,247,0.12)" }}
        >
          <Edit3 size={28} style={{ color: "var(--color-obsidian-accent)" }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
          No note open
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Select a note from the sidebar, or create a new one to get started.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(
            [
              { type: "markdown", label: "Markdown", icon: Edit3, color: "var(--color-obsidian-accent)", pluginId: null },
              { type: "drawing", label: "Drawing", icon: Pencil, color: "#cba6f7", pluginId: "excalidraw" },
              { type: "daily", label: "Daily Note", icon: CalendarDays, color: "#f9e2af", pluginId: null },
              { type: "kanban", label: "Kanban", icon: LayoutGrid, color: "#89b4fa", pluginId: "obsidian-kanban" },
            ] as const
          )
            .filter(({ pluginId }) => !pluginId || installedPluginIds.includes(pluginId))
            .map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => onNewNote(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="grid grid-cols-3 gap-3 text-xs text-center"
        style={{ color: "var(--color-obsidian-muted-text)" }}
      >
        {[
          { key: "Ctrl+N", desc: "New note" },
          { key: "Ctrl+P", desc: "Command palette" },
          { key: "Ctrl+E", desc: "Toggle view" },
          { key: "Ctrl+F", desc: "Search" },
          { key: "Ctrl+G", desc: "Graph view" },
          { key: "[[…]]", desc: "Link notes" },
        ].map(({ key, desc }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <kbd
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                background: "var(--color-obsidian-surface)",
                border: "1px solid var(--color-obsidian-border)",
                color: "var(--color-obsidian-text)",
              }}
            >
              {key}
            </kbd>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function Editor({
  state,
  onStateChange,
  onNoteChange,
  onNoteClick,
  onNewNote,
  isMobile = false,
}: EditorProps) {
  const { notes, activeNoteId, openNoteIds, viewMode } = state;
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ title: string; rect: DOMRect } | null>(null);
  const [linkAutocomplete, setLinkAutocomplete] = useState<{ filter: string; position: { top: number; left: number } } | null>(null);

  useEffect(() => {
    if (activeNote) setWordCount(countWords(activeNote.content));
  }, [activeNote]);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight}px`; }
  }, []);

  useEffect(() => { adjustHeight(); }, [activeNote?.content, viewMode, adjustHeight]);

  const handleContentChange = (value: string) => {
    if (!activeNote) return;
    onNoteChange(activeNote.id, { content: value, updatedAt: new Date().toISOString().split("T")[0] });
    setWordCount(countWords(value));
  };

  const handleTitleChange = (title: string) => {
    if (!activeNote) return;
    onNoteChange(activeNote.id, { title });
  };

  const handleInsertText = (text: string) => {
    if (!activeNote) return;
    const ta = textareaRef.current;
    if (ta) {
      const { selectionStart, value } = ta;
      const newValue = value.substring(0, selectionStart) + text + value.substring(selectionStart);
      handleContentChange(newValue);
      setTimeout(() => {
        ta.focus();
        const newPos = selectionStart + text.length;
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      handleContentChange((activeNote.content || "") + text);
    }
  };

  const handleWikilinkClick = (title: string) => {
    const target = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (target) onNoteClick(target.id);
  };

  const handleHoverLink = (title: string, rect: DOMRect) => {
    setHoverPreview({ title, rect });
  };

  const handleHoverEnd = () => {
    setHoverPreview(null);
  };

  // Keyboard shortcut for Find
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && activeNote && activeNote.type === "markdown") {
        e.preventDefault();
        setShowFindReplace(true);
      }
      if (e.key === "Escape" && showFindReplace) {
        setShowFindReplace(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeNote, showFindReplace]);

  const closeTab = (id: string) => {
    const remaining = openNoteIds.filter((oid) => oid !== id);
    const newActive = id === activeNoteId ? remaining[remaining.length - 1] ?? null : activeNoteId;
    onStateChange({ openNoteIds: remaining, activeNoteId: newActive });
  };

  const deleteActiveNote = (id: string) => {
    closeTab(id);
    onStateChange({
      notes: notes.filter((n) => n.id !== id),
      openNoteIds: openNoteIds.filter((oid) => oid !== id),
      activeNoteId: activeNoteId === id ? (openNoteIds.filter((oid) => oid !== id).pop() ?? null) : activeNoteId,
    });
  };

  const duplicateNote = (id: string) => {
    const source = notes.find((n) => n.id === id);
    if (!source) return;
    const newId = `note-${Date.now()}`;
    const dup: Note = { ...source, id: newId, title: `${source.title} (copy)`, createdAt: new Date().toISOString().split("T")[0], updatedAt: new Date().toISOString().split("T")[0] };
    onStateChange({
      notes: [...notes, dup],
      openNoteIds: [...openNoteIds, newId],
      activeNoteId: newId,
    });
  };

  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");

  const shareNote = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note || !state.user?.uid) return;

    setShareStatus("sharing");
    try {
      const { getFirebaseDb } = await import("@/lib/firebase/config");
      const { doc, setDoc } = await import("firebase/firestore");
      const db = getFirebaseDb();
      if (!db) {
        setShareStatus("idle");
        return;
      }

      // Generate a short random share ID
      const shareId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(doc(db, "shared", shareId), {
        title: note.title,
        content: note.content,
        type: note.type || "markdown",
        ownerId: state.user.uid,
        sharedByName: state.user.displayName || "Anonymous",
        sharedAt: new Date().toISOString(),
        noteId: note.id,
      });

      const shareUrl = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
    } catch {
      setShareStatus("idle");
    }
  };

  // Route to special views based on note type
  const renderNoteContent = () => {
    if (!activeNote) return <EmptyState onNewNote={onNewNote} installedPluginIds={state.installedPluginIds} />;

    // Drawing note — full Excalidraw canvas (requires Excalidraw plugin)
    if (activeNote.type === "drawing") {
      if (!state.installedPluginIds.includes("excalidraw")) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Pencil size={32} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
              Excalidraw plugin required
            </p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Install the Excalidraw plugin from the Marketplace to open drawing notes.
            </p>
            <button
              onClick={() => onStateChange({ marketplaceOpen: true })}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
            >
              Open Marketplace
            </button>
          </div>
        );
      }
      return (
        <ExcalidrawCanvas
          note={activeNote}
          onNoteChange={onNoteChange}
        />
      );
    }

    // Daily note
    if (activeNote.type === "daily") {
      return <DailyNoteView note={activeNote} onNoteChange={onNoteChange} />;
    }

    // Kanban note (requires Kanban plugin)
    if (activeNote.type === "kanban") {
      if (!state.installedPluginIds.includes("obsidian-kanban")) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <LayoutGrid size={32} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
              Kanban plugin required
            </p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Install the Kanban plugin from the Marketplace to open kanban boards.
            </p>
            <button
              onClick={() => onStateChange({ marketplaceOpen: true })}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
            >
              Open Marketplace
            </button>
          </div>
        );
      }
      return <KanbanView />;
    }

    // Markdown — split/edit/preview
    if (viewMode === "editor") {
      return (
        <EditorPane
          note={activeNote}
          notes={notes}
          onNoteChange={handleContentChange}
          onTitleChange={handleTitleChange}
          adjustHeight={adjustHeight}
          textareaRef={textareaRef}
          onLinkAutocomplete={setLinkAutocomplete}
          onCloseAutocomplete={() => setLinkAutocomplete(null)}
          preferences={state.preferences}
        />
      );
    }
    if (viewMode === "preview") {
      return (
        <PreviewPane
          note={activeNote}
          notes={notes}
          onWikilinkClick={handleWikilinkClick}
          onHoverLink={handleHoverLink}
          onHoverEnd={handleHoverEnd}
        />
      );
    }
    // split
    return (
      <>
        <div
          className="flex-1 flex flex-col overflow-hidden border-r"
          style={{ borderColor: "var(--color-obsidian-border)" }}
        >
          <EditorPane
            note={activeNote}
            notes={notes}
            onNoteChange={handleContentChange}
            onTitleChange={handleTitleChange}
            adjustHeight={adjustHeight}
            textareaRef={textareaRef}
            onLinkAutocomplete={setLinkAutocomplete}
            onCloseAutocomplete={() => setLinkAutocomplete(null)}
            preferences={state.preferences}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <PreviewPane
            note={activeNote}
            notes={notes}
            onWikilinkClick={handleWikilinkClick}
            onHoverLink={handleHoverLink}
            onHoverEnd={handleHoverEnd}
          />
        </div>
      </>
    );
  };

  const isDrawing = activeNote?.type === "drawing";

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--color-obsidian-bg)" }}
    >
      {/* Hide tab bar on mobile for cleaner UI */}
      {!isMobile && (
        <TabBar
          openNoteIds={openNoteIds}
          notes={notes}
          activeNoteId={activeNoteId}
          onActivate={(id) => onStateChange({ activeNoteId: id })}
          onClose={closeTab}
        />
      )}
      {/* Simplified toolbar on mobile */}
      {(!isMobile || (activeNote && activeNote.type !== "drawing")) && (
        <Toolbar
          viewMode={viewMode}
          onViewMode={(m) => onStateChange({ viewMode: m })}
          note={activeNote}
          onNoteChange={onNoteChange}
          onNewNote={onNewNote}
          onDeleteNote={deleteActiveNote}
          onDuplicateNote={duplicateNote}
          onToggleFindReplace={() => setShowFindReplace((v) => !v)}
          onInsertText={handleInsertText}
          onShareNote={shareNote}
          shareStatus={shareStatus}
          isLoggedIn={!!state.user}
        />
      )}
      {/* Find & Replace */}
      {showFindReplace && activeNote && activeNote.type === "markdown" && (
        <FindReplaceDialog
          content={activeNote.content}
          onContentChange={(content) => handleContentChange(content)}
          onClose={() => setShowFindReplace(false)}
          textareaRef={textareaRef}
        />
      )}
      <div className={`flex-1 min-h-0 overflow-hidden flex`}>
        {renderNoteContent()}
      </div>
      <StatusBar note={activeNote} wordCount={wordCount} />
      {/* Hover Preview */}
      {hoverPreview && (
        <HoverPreview
          title={hoverPreview.title}
          notes={notes}
          rect={hoverPreview.rect}
          onClose={handleHoverEnd}
          onNoteClick={onNoteClick}
        />
      )}
      {/* Link Autocomplete */}
      {linkAutocomplete && activeNote && (
        <LinkAutocomplete
          notes={notes}
          filter={linkAutocomplete.filter}
          position={linkAutocomplete.position}
          onSelect={(title) => {
            const ta = textareaRef.current;
            if (ta) {
              const { selectionStart, value } = ta;
              const beforeCursor = value.substring(0, selectionStart);
              const lastOpen = beforeCursor.lastIndexOf("[[");
              const after = value.substring(selectionStart);
              const newValue = beforeCursor.substring(0, lastOpen) + `[[${title}]]` + after;
              handleContentChange(newValue);
              const newPos = lastOpen + title.length + 4;
              setTimeout(() => ta.setSelectionRange(newPos, newPos), 0);
            }
            setLinkAutocomplete(null);
          }}
          onClose={() => setLinkAutocomplete(null)}
        />
      )}
    </div>
  );
}
