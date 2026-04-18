"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Eye, Edit3, Star, StarOff, X, Plus, Share2,
  MoreHorizontal, Bold, Italic, Code, Link, List, ListOrdered,
  Heading1, Heading2, Quote, Minus, CheckSquare, Hash, Pencil,
  CalendarDays, LayoutGrid, Search, Replace, ChevronDown, ChevronUp,
  CaseSensitive, Regex, FileText, Copy, Download, Clipboard, Trash2,
  Table2, Check, Loader2, ArrowDown, ArrowLeft, ArrowRight, AlignLeft, AlignCenter,
  AlignRight, RotateCcw, Rows3, Columns3, Timer, Play, Pause, RotateCw,
  Globe, BookOpen, GitCommit, Brain, Sparkles, FlipHorizontal,
  Layers,
} from "lucide-react";
import { Note, AppState, countWords, NoteType } from "./data";
import MarkdownRenderer from "./MarkdownRenderer";
import dynamic from "next/dynamic";

const ExcalidrawCanvas = dynamic(() => import("./ExcalidrawCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-obsidian-muted-text)",
      }}
    >
      Loading Excalidraw…
    </div>
  ),
});

const CanvasView = dynamic(() => import("./CanvasView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-obsidian-muted-text)",
      }}
    >
      Loading canvas…
    </div>
  ),
});

// CodeMirror 6
import { EditorState, StateField, type Extension } from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet, WidgetType, ViewPlugin, type ViewUpdate, keymap } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap, autocompletion, type CompletionContext, type CompletionSource } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

interface EditorProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
  onNoteClick: (id: string) => void;
  onNewNote: (type?: NoteType) => void;
  isMobile?: boolean;
  dirtyNoteIds?: Set<string>;
}

// ─── Note type badge ──────────────────────────────────────────────────────────

function NoteTypeBadge({ type }: { type?: NoteType }) {
  const map: Record<NoteType, { label: string; color: string; icon: React.ElementType }> = {
    markdown: { label: "Markdown", color: "var(--color-obsidian-muted-text)", icon: Edit3 },
    drawing: { label: "Drawing", color: "#cba6f7", icon: Pencil },
    daily: { label: "Daily Note", color: "#f9e2af", icon: CalendarDays },
    kanban: { label: "Kanban", color: "#89b4fa", icon: LayoutGrid },
    table: { label: "Table", color: "#a6e3a1", icon: Edit3 },
    canvas: { label: "Canvas", color: "#74c7ec", icon: Layers },
  };
  const t = type ?? "markdown";
  const { label, color, icon: Icon } = map[t];
  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        fontSize: 10.5,
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}
    >
      <Icon size={10} strokeWidth={2.25} />
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
            {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : findText ? "No results" : ""}
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
          aria-label="Previous match"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => goToMatch(currentMatch + 1)}
          disabled={matches.length === 0}
          className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          aria-label="Next match"
        >
          <ChevronDown size={13} />
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

        <button onClick={onClose} className="p-1 rounded hover:bg-white/5" aria-label="Close find and replace">
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
            background: i === selectedIndex ? "var(--color-obsidian-selection)" : "transparent",
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
      // Preserve everything after the first colon (including array brackets, commas, etc.)
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
          {fields.map((field, i) => {
            const isStructuredField = ["id", "tags", "type", "starred", "pinned", "trashed", "trashedAt", "wordCount"].includes(field.key);
            return (
            <div key={i} className="flex items-center gap-2">
              <input
                value={field.key}
                onChange={(e) => updateField(i, e.target.value, field.value)}
                readOnly={isStructuredField}
                className="w-24 px-2 py-1 rounded text-xs bg-transparent outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-accent-soft)",
                  fontFamily: "var(--font-mono)",
                  opacity: isStructuredField ? 0.6 : 1,
                }}
              />
              <span style={{ color: "var(--color-obsidian-muted-text)" }}>:</span>
              <input
                value={field.value}
                onChange={(e) => updateField(i, field.key, e.target.value)}
                readOnly={isStructuredField}
                className="flex-1 px-2 py-1 rounded text-xs bg-transparent outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-text)",
                  fontFamily: "var(--font-mono)",
                  opacity: isStructuredField ? 0.6 : 1,
                }}
                title={isStructuredField ? "This field is managed by the app" : undefined}
              />
              {!isStructuredField && (
              <button
                onClick={() => removeField(i)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--color-obsidian-muted-text)" }}
                aria-label="Remove field"
              >
                <X size={12} />
              </button>
              )}
            </div>
            );
          })}
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
  dirtyNoteIds,
}: {
  openNoteIds: string[];
  notes: Note[];
  activeNoteId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  dirtyNoteIds?: Set<string>;
}) {
  const activeTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeNoteId]);

  return (
    <div
      role="tablist"
      aria-label="Open notes"
      className="editor-tab-strip flex items-end overflow-x-auto shrink-0 px-2 pt-1.5 gap-0.5"
      style={{
        background: "transparent",
        height: 38,
      }}
    >
      {openNoteIds.map((id) => {
        const note = notes.find((n) => n.id === id);
        const isActive = id === activeNoteId;
        const accentByType: Record<string, string> = {
          drawing: "#cba6f7",
          daily: "#f9e2af",
          kanban: "#89b4fa",
          table: "#a6e3a1",
          canvas: "#74c7ec",
          markdown: "var(--color-obsidian-accent)",
        };
        const dotColor = accentByType[note?.type ?? "markdown"];
        return (
          <div
            key={id}
            ref={isActive ? activeTabRef : undefined}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            className="group relative flex items-center gap-2 px-3 cursor-pointer shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"
            style={{
              height: 30,
              borderRadius: "8px 8px 2px 2px",
              background: isActive
                ? "var(--color-obsidian-bg)"
                : "transparent",
              border: isActive
                ? "1px solid var(--color-obsidian-border)"
                : "1px solid transparent",
              borderBottom: isActive ? "1px solid var(--color-obsidian-bg)" : "1px solid transparent",
              marginBottom: isActive ? -1 : 0,
              color: isActive ? "var(--color-obsidian-text)" : "var(--color-obsidian-muted-text)",
              fontWeight: isActive ? 500 : 400,
              maxWidth: 200,
              minWidth: 110,
              boxShadow: isActive
                ? "0 -2px 8px -4px rgba(0,0,0,0.4)"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "color-mix(in srgb, var(--color-obsidian-text) 4%, transparent)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
            onClick={() => onActivate(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate(id);
              } else if (e.key === "Delete" || (e.ctrlKey && e.key === "w")) {
                e.preventDefault();
                onClose(id);
              } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const idx = openNoteIds.indexOf(id);
                const nextIdx = e.key === "ArrowRight"
                  ? (idx + 1) % openNoteIds.length
                  : (idx - 1 + openNoteIds.length) % openNoteIds.length;
                onActivate(openNoteIds[nextIdx]);
              }
            }}
          >
            {/* Type indicator dot */}
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: isActive ? dotColor : `color-mix(in srgb, ${dotColor} 60%, transparent)`,
                boxShadow: isActive ? `0 0 6px ${dotColor}` : "none",
                transition: "all 0.15s",
              }}
            />
            <span className="truncate flex-1" style={{ fontSize: 12, letterSpacing: "-0.01em" }}>{note?.title ?? "Untitled"}</span>
            {dirtyNoteIds?.has(id) && (
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background: "var(--color-obsidian-accent)",
                }}
                title="Unsaved changes"
              />
            )}
            <button
              className={`${isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} hover:opacity-100 hover:bg-white/10 transition-all rounded p-0.5 -mr-1`}
              onClick={(e) => { e.stopPropagation(); onClose(id); }}
              aria-label="Close tab"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Table Editor Dialog ──────────────────────────────────────────────────────

type TableAlign = "left" | "center" | "right";

interface TableEditorDialogProps {
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

function TableEditorDialog({ onInsert, onClose }: TableEditorDialogProps) {
  const [headers, setHeaders] = useState<string[]>(["Header 1", "Header 2", "Header 3"]);
  const [rows, setRows] = useState<string[][]>([
    ["", "", ""],
    ["", "", ""],
  ]);
  const [aligns, setAligns] = useState<TableAlign[]>(["left", "left", "left"]);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const colCount = headers.length;

  const markDirty = () => { if (!dirty) setDirty(true); };

  const setHeader = (col: number, value: string) => {
    setHeaders((h) => h.map((v, i) => (i === col ? value : v)));
    markDirty();
  };

  const setCell = (row: number, col: number, value: string) => {
    setRows((r) => r.map((rv, ri) => (ri === row ? rv.map((cv, ci) => (ci === col ? value : cv)) : rv)));
    markDirty();
  };

  const setAlign = (col: number, align: TableAlign) => {
    setAligns((a) => a.map((v, i) => (i === col ? align : v)));
    markDirty();
  };

  const addColumn = () => {
    setHeaders((h) => [...h, `Header ${h.length + 1}`]);
    setRows((r) => r.map((rv) => [...rv, ""]));
    setAligns((a) => [...a, "left"]);
    markDirty();
  };

  const removeColumn = (col: number) => {
    if (colCount <= 1) return;
    setHeaders((h) => h.filter((_, i) => i !== col));
    setRows((r) => r.map((rv) => rv.filter((_, i) => i !== col)));
    setAligns((a) => a.filter((_, i) => i !== col));
    markDirty();
  };

  const addRow = () => {
    setRows((r) => [...r, Array(colCount).fill("")]);
    markDirty();
  };

  const removeRow = (row: number) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, i) => i !== row));
    markDirty();
  };

  const resetTable = () => {
    setHeaders(["Header 1", "Header 2", "Header 3"]);
    setRows([["", "", ""], ["", "", ""]]);
    setAligns(["left", "left", "left"]);
    setDirty(false);
  };

  const buildMarkdown = (): string => {
    const pad = (s: string, w: number, align: TableAlign) => {
      const trimmed = s.trim() || " ";
      const diff = Math.max(0, w - trimmed.length);
      if (align === "center") {
        const left = Math.floor(diff / 2);
        return " ".repeat(left) + trimmed + " ".repeat(diff - left);
      }
      if (align === "right") return " ".repeat(diff) + trimmed;
      return trimmed + " ".repeat(diff);
    };

    // Column widths
    const widths = headers.map((h, ci) => {
      const dataMax = rows.reduce((m, r) => Math.max(m, (r[ci] || "").trim().length), 0);
      return Math.max(h.trim().length, dataMax, 3);
    });

    const sep = aligns.map((a, i) => {
      const w = widths[i];
      if (a === "center") return `:${"-".repeat(w - 2)}:`;
      if (a === "right") return `${"-".repeat(w - 1)}:`;
      return "-".repeat(w);
    });

    const headerLine = `| ${headers.map((h, i) => pad(h, widths[i], aligns[i])).join(" | ")} |`;
    const sepLine = `| ${sep.join(" | ")} |`;
    const dataLines = rows.map(
      (r) => `| ${r.map((c, i) => pad(c, widths[i], aligns[i])).join(" | ")} |`
    );

    return `\n${headerLine}\n${sepLine}\n${dataLines.join("\n")}\n`;
  };

  const handleInsert = () => {
    onInsert(buildMarkdown());
  };

  const handleClose = () => {
    if (dirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  const alignIcon = (a: TableAlign) => {
    if (a === "center") return AlignCenter;
    if (a === "right") return AlignRight;
    return AlignLeft;
  };

  const cycleAlign = (col: number) => {
    const order: TableAlign[] = ["left", "center", "right"];
    const cur = aligns[col];
    const next = order[(order.indexOf(cur) + 1) % 3];
    setAlign(col, next);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="table-editor-dialog relative w-full max-w-2xl mx-4 rounded-xl"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          animation: "scaleIn 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <div className="flex items-center gap-2">
            <Table2 size={16} style={{ color: "var(--color-obsidian-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
              Table Editor
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-obsidian-surface-2)", color: "var(--color-obsidian-muted-text)" }}>
              {colCount} × {rows.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-1 px-4 py-2 flex-wrap"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
        >
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10"
            style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)" }}
            title="Add column"
          >
            <Columns3 size={12} />
            <Plus size={10} />
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10"
            style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)" }}
            title="Add row"
          >
            <Rows3 size={12} />
            <Plus size={10} />
          </button>
          <div className="h-4 w-px mx-1" style={{ background: "var(--color-obsidian-border)" }} />
          <button
            onClick={resetTable}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            title="Reset table"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <div className="flex-1" />
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Click align buttons to cycle ←  ↔  →
          </span>
        </div>

        {/* Table grid */}
        <div className="px-4 py-3 overflow-auto max-h-[50vh]">
          <table className="w-full border-collapse">
            {/* Column align buttons */}
            <thead>
              <tr>
                <th className="w-8" />
                {headers.map((_, ci) => {
                  const AIcon = alignIcon(aligns[ci]);
                  return (
                    <th key={ci} className="px-1 pb-1">
                      <button
                        onClick={() => cycleAlign(ci)}
                        className="w-full flex items-center justify-center p-1 rounded transition-colors hover:bg-white/10"
                        style={{ color: "var(--color-obsidian-muted-text)" }}
                        title={`Align: ${aligns[ci]}`}
                      >
                        <AIcon size={12} />
                      </button>
                    </th>
                  );
                })}
                <th className="w-8" />
              </tr>
              {/* Headers row */}
              <tr>
                <th
                  className="text-xs font-normal px-1 py-1"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                >
                  H
                </th>
                {headers.map((h, ci) => (
                  <th key={ci} className="px-1 py-1">
                    <input
                      value={h}
                      onChange={(e) => setHeader(ci, e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md text-xs font-semibold outline-none"
                      style={{
                        background: "var(--color-obsidian-bg)",
                        color: "var(--color-obsidian-text)",
                        border: "1px solid var(--color-obsidian-border)",
                      }}
                    />
                  </th>
                ))}
                <th className="px-1">
                  {colCount > 1 && (
                    <button
                      onClick={() => removeColumn(colCount - 1)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      style={{ color: "#f38ba8" }}
                      title="Remove last column"
                    >
                      <X size={12} />
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  <td
                    className="text-xs font-normal px-1 py-1 text-center"
                    style={{ color: "var(--color-obsidian-muted-text)" }}
                  >
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-1 py-1">
                      <input
                        value={cell}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 rounded-md text-xs outline-none placeholder:opacity-30"
                        style={{
                          background: "var(--color-obsidian-bg)",
                          color: "var(--color-obsidian-text)",
                          border: "1px solid var(--color-obsidian-border)",
                        }}
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(ri)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: "#f38ba8" }}
                        title="Remove row"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Quick add buttons at bottom / right */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-white/5"
              style={{ color: "var(--color-obsidian-muted-text)", border: "1px dashed var(--color-obsidian-border)" }}
            >
              <ArrowDown size={11} /> Add row
            </button>
            <button
              onClick={addColumn}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-white/5"
              style={{ color: "var(--color-obsidian-muted-text)", border: "1px dashed var(--color-obsidian-border)" }}
            >
              <ArrowRight size={11} /> Add column
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Inserts as Markdown table
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{
                color: "var(--color-obsidian-text)",
                border: "1px solid var(--color-obsidian-border)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
            >
              Insert Table
            </button>
          </div>
        </div>

        {/* Discard confirmation overlay */}
        {showDiscard && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-80 rounded-2xl p-6"
              style={{
                background: "var(--color-obsidian-bg)",
                border: "1px solid var(--color-obsidian-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(243,139,168,0.15)" }}
                >
                  <RotateCcw size={15} style={{ color: "#f38ba8" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
                  Unsaved changes
                </p>
              </div>
              <p className="text-xs leading-relaxed mb-5 pl-[42px]" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Your table edits haven&apos;t been inserted yet. What would you like to do?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleInsert}
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
                >
                  Save &amp; Insert
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDiscard(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)" }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: "#f38ba8", border: "1px solid rgba(243,139,168,0.3)" }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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
  isMobile,
  installedPluginIds,
  onTogglePomodoro,
  onToggleAIPanel,
  onToggleGitHistory,
  onToggleSlidingPanes,
  slidingPanesActive,
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
  isMobile?: boolean;
  installedPluginIds?: string[];
  onTogglePomodoro?: () => void;
  onToggleAIPanel?: () => void;
  onToggleGitHistory?: () => void;
  onToggleSlidingPanes?: () => void;
  slidingPanesActive?: boolean;
}) {
  const isDrawing = note?.type === "drawing";
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const plugins = installedPluginIds ?? [];

  const iconSize = isMobile ? 16 : 13;
  const btnClass = isMobile
    ? "p-2 rounded-md hover:bg-white/10 active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"
    : "p-1.5 rounded-md hover:bg-white/[0.06] active:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]";

  // Pill cluster wrapper — groups related icon buttons with a subtle inset background
  const clusterStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--color-obsidian-text) 3.5%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-obsidian-border) 60%, transparent)",
    borderRadius: 8,
    padding: 2,
    display: "flex",
    alignItems: "center",
    gap: 1,
  };

  const formattingInline = [
    { icon: Bold, title: "Bold", insert: "**bold**" },
    { icon: Italic, title: "Italic", insert: "*italic*" },
    { icon: Code, title: "Code", insert: "`code`" },
  ];

  const formattingBlock = [
    { icon: Heading1, title: "H1", insert: "\n# " },
    { icon: Heading2, title: "H2", insert: "\n## " },
    { icon: List, title: "Bullet list", insert: "\n- " },
    { icon: ListOrdered, title: "Numbered list", insert: "\n1. " },
    { icon: CheckSquare, title: "Task list", insert: "\n- [ ] " },
    { icon: Quote, title: "Blockquote", insert: "\n> " },
    { icon: Minus, title: "Horizontal rule", insert: "\n---\n" },
    { icon: Link, title: "Link", insert: "[text](url)" },
    { icon: Hash, title: "Tag", insert: "#tag " },
    { icon: Table2, title: "Table", insert: "__table__" },
  ];

  const showFormatting = !isDrawing && viewMode === "editor" && !!note;

  return (
    <>
    <div
      className="shrink-0"
      style={{
        borderBottom: "1px solid var(--color-obsidian-border)",
        background: "var(--color-obsidian-bg)",
      }}
    >
      {/* Row 1: View mode, note type, actions */}
      <div className="editor-toolbar-row flex items-center gap-2 px-3 overflow-x-auto" style={{ scrollbarWidth: "none", height: 44 }}>
        {/* View mode — only for non-drawing notes */}
        {!isDrawing && (
          <>
            <div
              role="tablist"
              aria-label="View mode"
              className="flex items-center"
              style={{
                padding: 2,
                borderRadius: 8,
                background: "color-mix(in srgb, var(--color-obsidian-text) 4%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-obsidian-border) 60%, transparent)",
              }}
            >
              {(
                isMobile
                  ? [
                      { mode: "live" as const, icon: Eye, title: "Live Preview" },
                      { mode: "editor" as const, icon: Edit3, title: "Source" },
                      { mode: "preview" as const, icon: BookOpen, title: "Reading" },
                    ]
                  : [
                      { mode: "live" as const, icon: Eye, title: "Live Preview (Ctrl+E)" },
                      { mode: "editor" as const, icon: Edit3, title: "Source mode (Ctrl+E)" },
                      { mode: "preview" as const, icon: BookOpen, title: "Reading mode (Ctrl+E)" },
                    ]
              ).map(({ mode, icon: Icon, title }) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    role="tab"
                    aria-selected={active}
                    onClick={() => onViewMode(mode)}
                    title={title}
                    className={`transition-all focus-visible:outline-none ${isMobile ? "px-3 py-1.5" : "px-2.5 py-1"}`}
                    style={{
                      borderRadius: 6,
                      background: active
                        ? "var(--color-obsidian-surface)"
                        : "transparent",
                      color: active
                        ? "var(--color-obsidian-text)"
                        : "var(--color-obsidian-muted-text)",
                      boxShadow: active
                        ? "0 1px 2px rgba(0,0,0,0.25), 0 0 0 1px color-mix(in srgb, var(--color-obsidian-border) 80%, transparent)"
                        : "none",
                    }}
                  >
                    <Icon size={iconSize} />
                  </button>
                );
              })}
            </div>
            {plugins.includes("sliding-panes") && !isMobile && (
              <button onClick={onToggleSlidingPanes} title="Sliding Panes"
                className={btnClass}
                style={{ color: slidingPanesActive ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}>
                <FlipHorizontal size={iconSize} />
              </button>
            )}
          </>
        )}

        {/* Note type badge */}
        {note && <NoteTypeBadge type={note.type} />}

        {/* Formatting buttons — desktop only, inline in row 1, grouped in pill clusters */}
        {!isMobile && showFormatting && (
          <>
            <div style={clusterStyle}>
              {formattingInline.map(({ icon: Icon, title, insert }) => (
                <button
                  key={title}
                  title={title}
                  className="p-1.5 rounded-md hover:bg-white/[0.08] active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                  onClick={() => onInsertText?.(insert)}
                >
                  <Icon size={iconSize} />
                </button>
              ))}
            </div>
            <div style={clusterStyle}>
              {formattingBlock.map(({ icon: Icon, title, insert }) => (
                <button
                  key={title}
                  title={title}
                  className="p-1.5 rounded-md hover:bg-white/[0.08] active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"
                  style={{ color: "var(--color-obsidian-muted-text)" }}
                  onClick={() => insert === "__table__" ? setTableDialogOpen(true) : onInsertText?.(insert)}
                >
                  <Icon size={iconSize} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        {note && (
          <div style={!isMobile ? clusterStyle : undefined} className={isMobile ? "flex items-center gap-1" : undefined}>
            <button
              onClick={() => onNoteChange(note.id, { starred: !note.starred })}
              className={isMobile ? btnClass : "p-1.5 rounded-md hover:bg-white/[0.08] active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"}
              style={{ color: note.starred ? "#f9e2af" : "var(--color-obsidian-muted-text)" }}
              title={note.starred ? "Remove bookmark" : "Bookmark"}
            >
              {note.starred ? <Star size={iconSize} /> : <StarOff size={iconSize} />}
            </button>
            {isLoggedIn && (
              <button
                className={isMobile ? btnClass : "p-1.5 rounded-md hover:bg-white/[0.08] active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"}
                style={{ color: shareStatus === "copied" ? "#a6e3a1" : shareStatus === "sharing" ? "var(--color-obsidian-accent)" : "var(--color-obsidian-muted-text)" }}
                title={shareStatus === "copied" ? "Link copied!" : shareStatus === "sharing" ? "Sharing…" : "Share note"}
                onClick={() => note && shareStatus !== "sharing" && onShareNote?.(note.id)}
                disabled={shareStatus === "sharing"}
              >
                {shareStatus === "copied" ? <Check size={iconSize} /> : shareStatus === "sharing" ? <Loader2 size={iconSize} className="animate-spin" /> : <Share2 size={iconSize} />}
              </button>
            )}
            <div className="relative">
              <button
                ref={moreButtonRef}
                onClick={() => setMoreMenuOpen((v) => !v)}
                className={isMobile ? btnClass : "p-1.5 rounded-md hover:bg-white/[0.08] active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"}
                style={{ color: moreMenuOpen ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}
                title="More options"
              >
                <MoreHorizontal size={iconSize} />
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[998]" onClick={() => setMoreMenuOpen(false)} />
                  {isMobile ? (
                    /* Mobile: bottom sheet menu */
                    <div
                      className="fixed left-0 right-0 bottom-0 z-[999] rounded-t-2xl overflow-hidden shadow-2xl"
                      style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)", borderBottom: "none", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
                    >
                      <div className="flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-obsidian-border)" }} />
                      </div>
                      {!isDrawing && (
                        <button
                          className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onToggleFindReplace?.(); }}
                        >
                          <Search size={16} /> Find & Replace
                        </button>
                      )}
                      <button
                        className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)" }}
                        onClick={() => { setMoreMenuOpen(false); if (note) onDuplicateNote?.(note.id); }}
                      >
                        <Copy size={16} /> Duplicate note
                      </button>
                      <button
                        className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)" }}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          if (note) {
                            if (typeof window !== "undefined" && "electronAPI" in window) {
                              const api = (window as unknown as { electronAPI: { dialog?: { saveFile: (name: string, content: string, filters?: { name: string; extensions: string[] }[]) => Promise<boolean> } } }).electronAPI;
                              if (api?.dialog?.saveFile) {
                                api.dialog.saveFile(
                                  `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`,
                                  note.content,
                                  [{ name: "Markdown", extensions: ["md"] }, { name: "All Files", extensions: ["*"] }]
                                );
                                return;
                              }
                            }
                            const blob = new Blob([note.content], { type: "text/markdown" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${note.title}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        <Download size={16} /> Export as Markdown
                      </button>
                      <button
                        className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-obsidian-text)" }}
                        onClick={() => { setMoreMenuOpen(false); if (note) navigator.clipboard.writeText(note.content); }}
                      >
                        <Clipboard size={16} /> Copy content
                      </button>
                      {plugins.includes("obsidian-publish-plus") && note && (
                        <button className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); if (note) exportNoteAsHTML(note); }}>
                          <Globe size={16} /> Export as HTML
                        </button>
                      )}
                      {plugins.includes("obsidian-git") && note && (
                        <button className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onToggleGitHistory?.(); }}>
                          <GitCommit size={16} /> Version History
                        </button>
                      )}
                      {plugins.includes("ai-assistant") && note && (
                        <button className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onToggleAIPanel?.(); }}>
                          <Sparkles size={16} /> Writing Analytics
                        </button>
                      )}
                      {plugins.includes("pomodoro") && (
                        <button className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onTogglePomodoro?.(); }}>
                          <Timer size={16} /> Pomodoro Timer
                        </button>
                      )}
                      {plugins.includes("citations") && note && (
                        <button className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => {
                            setMoreMenuOpen(false);
                            const content = note.content;
                            const hasBib = content.includes("## References");
                            let newContent = content;
                            if (!hasBib) {
                              newContent += `\n\n## References\n\n- [@authorYear] Author, A. (Year). *Title*. Journal, Volume(Issue), Pages.`;
                            }
                            onNoteChange(note.id, { content: newContent });
                          }}>
                          <BookOpen size={16} /> Insert Citation
                        </button>
                      )}
                      <div className="mx-4 my-1" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />
                      <button
                        className="w-full text-left flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "#f38ba8" }}
                        onClick={() => { setMoreMenuOpen(false); if (note) onDeleteNote?.(note.id); }}
                      >
                        <Trash2 size={16} /> Delete note
                      </button>
                      <div className="h-2" />
                    </div>
                  ) : (
                    /* Desktop: dropdown menu */
                    <div
                      className="fixed z-[999] w-48 rounded-lg overflow-hidden shadow-xl"
                      style={{
                        background: "var(--color-obsidian-surface)",
                        border: "1px solid var(--color-obsidian-border)",
                        top: moreButtonRef.current ? moreButtonRef.current.getBoundingClientRect().bottom + 4 : 0,
                        left: moreButtonRef.current ? moreButtonRef.current.getBoundingClientRect().right - 192 : 0,
                      }}
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
                            if (typeof window !== "undefined" && "electronAPI" in window) {
                              const api = (window as unknown as { electronAPI: { dialog?: { saveFile: (name: string, content: string, filters?: { name: string; extensions: string[] }[]) => Promise<boolean> } } }).electronAPI;
                              if (api?.dialog?.saveFile) {
                                api.dialog.saveFile(
                                  `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`,
                                  note.content,
                                  [{ name: "Markdown", extensions: ["md"] }, { name: "All Files", extensions: ["*"] }]
                                );
                                return;
                              }
                            }
                            const blob = new Blob([note.content], { type: "text/markdown" });
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
                      {plugins.includes("obsidian-publish-plus") && note && (
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); if (note) exportNoteAsHTML(note); }}>
                          <Globe size={11} /> Export as HTML
                        </button>
                      )}
                      {plugins.includes("obsidian-git") && note && (
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onToggleGitHistory?.(); }}>
                          <GitCommit size={11} /> Version History
                        </button>
                      )}
                      {plugins.includes("ai-assistant") && note && (
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onToggleAIPanel?.(); }}>
                          <Sparkles size={11} /> Writing Analytics
                        </button>
                      )}
                      {plugins.includes("pomodoro") && (
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => { setMoreMenuOpen(false); onTogglePomodoro?.(); }}>
                          <Timer size={11} /> Pomodoro Timer
                        </button>
                      )}
                      {plugins.includes("citations") && note && (
                        <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-obsidian-text)" }}
                          onClick={() => {
                            setMoreMenuOpen(false);
                            const content = note.content;
                            const hasBib = content.includes("## References");
                            let newContent = content;
                            if (!hasBib) {
                              newContent += `\n\n## References\n\n- [@authorYear] Author, A. (Year). *Title*. Journal, Volume(Issue), Pages.`;
                            }
                            onNoteChange(note.id, { content: newContent });
                          }}>
                          <BookOpen size={11} /> Insert Citation
                        </button>
                      )}
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
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Formatting tools — mobile only, wrapping */}
      {isMobile && showFormatting && (
        <div
          className="flex flex-wrap items-center gap-1 px-3 py-1.5"
          style={{ borderTop: "1px solid var(--color-obsidian-border)" }}
        >
          {formattingInline.map(({ icon: Icon, title, insert }) => (
            <button
              key={title}
              title={title}
              className={btnClass}
              style={{ color: "var(--color-obsidian-muted-text)" }}
              onClick={() => onInsertText?.(insert)}
            >
              <Icon size={iconSize} />
            </button>
          ))}
          <div className="h-4 w-px mx-0.5" style={{ background: "var(--color-obsidian-border)" }} />
          {formattingBlock.map(({ icon: Icon, title, insert }) => (
            <button
              key={title}
              title={title}
              className={btnClass}
              style={{ color: "var(--color-obsidian-muted-text)" }}
              onClick={() => insert === "__table__" ? setTableDialogOpen(true) : onInsertText?.(insert)}
            >
              <Icon size={iconSize} />
            </button>
          ))}
        </div>
      )}
    </div>

    {tableDialogOpen && (
      <TableEditorDialog
        onInsert={(md) => { onInsertText?.(md); setTableDialogOpen(false); }}
        onClose={() => setTableDialogOpen(false)}
      />
    )}
    </>
  );
}

// ─── Pomodoro Timer Widget ────────────────────────────────────────────────────

function PomodoroWidget({ state, onStateChange }: {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
}) {
  const pom = state.pomodoro ?? { running: false, mode: "work" as const, secondsLeft: 25 * 60, sessions: 0, workMinutes: 25, breakMinutes: 5 };
  const workMins = pom.workMinutes ?? 25;
  const breakMins = pom.breakMinutes ?? 5;
  const [editing, setEditing] = useState(false);
  const [editWork, setEditWork] = useState(String(workMins));
  const [editBreak, setEditBreak] = useState(String(breakMins));

  useEffect(() => {
    if (!pom.running) return;
    const interval = setInterval(() => {
      const next = pom.secondsLeft - 1;
      if (next <= 0) {
        const isWork = pom.mode === "work";
        onStateChange({
          pomodoro: {
            ...pom,
            running: true,
            mode: isWork ? "break" : "work",
            secondsLeft: isWork ? breakMins * 60 : workMins * 60,
            sessions: isWork ? pom.sessions + 1 : pom.sessions,
          },
        });
      } else {
        onStateChange({ pomodoro: { ...pom, secondsLeft: next } });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pom, onStateChange, workMins, breakMins]);

  const mins = Math.floor(pom.secondsLeft / 60);
  const secs = pom.secondsLeft % 60;
  const modeColor = pom.mode === "work" ? "#f38ba8" : "#a6e3a1";

  const openEditor = () => {
    if (pom.running) {
      onStateChange({ pomodoro: { ...pom, running: false } });
    }
    setEditWork(String(workMins));
    setEditBreak(String(breakMins));
    setEditing(true);
  };

  const applyDurations = () => {
    const w = Math.max(1, Math.min(120, parseInt(editWork) || 25));
    const b = Math.max(1, Math.min(120, parseInt(editBreak) || 5));
    const isWorkMode = pom.mode === "work";
    onStateChange({
      pomodoro: {
        ...pom,
        workMinutes: w,
        breakMinutes: b,
        running: false,
        secondsLeft: isWorkMode ? w * 60 : b * 60,
      },
    });
    setEditing(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 rounded-xl shadow-2xl"
      style={{ background: "var(--color-obsidian-surface)", border: `1px solid ${modeColor}40` }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-2 h-2 rounded-full" style={{ background: modeColor, boxShadow: pom.running ? `0 0 6px ${modeColor}` : "none" }} />
        <button
          onClick={openEditor}
          className="text-sm font-mono font-bold tabular-nums cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-obsidian-text)", minWidth: "3.5em", background: "none", border: "none", padding: 0 }}
          title="Click to edit duration">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </button>
        <span className="text-xs capitalize" style={{ color: modeColor }}>{pom.mode}</span>
        <button onClick={() => { onStateChange({ pomodoro: { ...pom, running: !pom.running } }); setEditing(false); }}
          className="p-1 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-text)" }}>
          {pom.running ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button onClick={() => { onStateChange({ pomodoro: { ...pom, running: false, mode: "work", secondsLeft: workMins * 60, sessions: pom.sessions } }); setEditing(false); }}
          className="p-1 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-muted-text)" }}>
          <RotateCw size={12} />
        </button>
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>#{pom.sessions}</span>
        <button onClick={() => onStateChange({ pomodoro: undefined })}
          className="p-0.5 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-muted-text)" }}>
          <X size={10} />
        </button>
      </div>
      {editing && !pom.running && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: `1px solid ${modeColor}20` }}>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "#f38ba8" }}>Work</span>
            <input
              type="number" min={1} max={120} value={editWork}
              onChange={(e) => setEditWork(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyDurations(); }}
              className="w-10 text-xs font-mono font-bold text-center rounded px-1 py-0.5"
              style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)", outline: "none" }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "#a6e3a1" }}>Break</span>
            <input
              type="number" min={1} max={120} value={editBreak}
              onChange={(e) => setEditBreak(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyDurations(); }}
              className="w-10 text-xs font-mono font-bold text-center rounded px-1 py-0.5"
              style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-border)", outline: "none" }}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>min</span>
          <button onClick={applyDurations} className="p-0.5 rounded hover:bg-white/10" style={{ color: "#a6e3a1" }}>
            <Check size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI Writing Stats Panel ───────────────────────────────────────────────────

function AIWritingPanel({ note, onClose }: { note: Note; onClose: () => void }) {
  const text = note.content;
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const avgWordsPerSentence = sentences.length ? Math.round(words.length / sentences.length) : 0;
  const readingTimeMin = Math.max(1, Math.ceil(words.length / 200));

  // Flesch reading ease (simplified)
  const syllables = words.reduce((sum, w) => {
    const s = w.toLowerCase().replace(/[^a-z]/g, "");
    const count = s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
    return sum + (count ? count.length : 1);
  }, 0);
  const fleschScore = sentences.length > 0 && words.length > 0
    ? Math.round(206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length))
    : 0;
  const readability = fleschScore >= 60 ? "Easy" : fleschScore >= 30 ? "Moderate" : "Complex";
  const readabilityColor = fleschScore >= 60 ? "#a6e3a1" : fleschScore >= 30 ? "#f9e2af" : "#f38ba8";

  const headings = (text.match(/^#{1,6}\s/gm) || []).length;
  const links = (text.match(/\[\[.+?\]\]|\[.+?\]\(.+?\)/g) || []).length;
  const codeBlocks = (text.match(/```/g) || []).length / 2;

  const stats = [
    { label: "Words", value: words.length },
    { label: "Characters", value: text.length },
    { label: "Sentences", value: sentences.length },
    { label: "Paragraphs", value: paragraphs.length },
    { label: "Avg Words/Sentence", value: avgWordsPerSentence },
    { label: "Reading Time", value: `${readingTimeMin} min` },
    { label: "Headings", value: headings },
    { label: "Links", value: links },
    { label: "Code Blocks", value: Math.floor(codeBlocks) },
  ];

  return (
    <div className="absolute right-2 top-12 z-50 w-64 rounded-xl shadow-2xl overflow-hidden"
      style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: "var(--color-obsidian-accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>Writing Analytics</span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10"
          style={{ color: "var(--color-obsidian-muted-text)" }}><X size={12} /></button>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: `${readabilityColor}15` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${readabilityColor}25`, color: readabilityColor }}>{fleschScore}</div>
          <div>
            <p className="text-xs font-medium" style={{ color: readabilityColor }}>{readability}</p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Readability Score</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex justify-between px-2 py-1 rounded"
              style={{ background: "var(--color-obsidian-bg)" }}>
              <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>{label}</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-obsidian-text)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Publish Plus Export ───────────────────────────────────────────────────────

function exportNoteAsHTML(note: Note) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; color: #e0e0e0; background: #1a1a2e; line-height: 1.7; }
    h1,h2,h3 { color: #f0f0f0; } a { color: #89b4fa; } code { background: #2a2a4a; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #2a2a4a; padding: 1rem; border-radius: 8px; overflow-x: auto; } pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #89b4fa; margin: 1rem 0; padding: 0.5rem 1rem; color: #a0a0c0; }
    img { max-width: 100%; border-radius: 8px; } hr { border: none; border-top: 1px solid #333; margin: 2rem 0; }
    .tags { display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap; }
    .tag { background: #89b4fa20; color: #89b4fa; padding: 2px 10px; border-radius: 999px; font-size: 0.8em; }
    .meta { color: #888; font-size: 0.85em; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <p class="meta">Created ${note.createdAt} · Updated ${note.updatedAt}</p>
  ${note.tags.length ? `<div class="tags">${note.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}</div>` : ""}
  <div>${note.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
</body>
</html>`;
  // Use native save dialog in Electron
  if (typeof window !== "undefined" && "electronAPI" in window) {
    const api = (window as unknown as { electronAPI: { dialog?: { saveFile: (name: string, content: string, filters?: { name: string; extensions: string[] }[]) => Promise<boolean> } } }).electronAPI;
    if (api?.dialog?.saveFile) {
      api.dialog.saveFile(
        `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.html`,
        html,
        [{ name: "HTML", extensions: ["html", "htm"] }, { name: "All Files", extensions: ["*"] }]
      );
      return;
    }
  }
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.title}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Git Version History Panel ────────────────────────────────────────────────

function GitHistoryPanel({ note, onClose, onRestore }: {
  note: Note;
  onClose: () => void;
  onRestore: (content: string, title: string) => void;
}) {
  const versions = note.versionHistory ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [diffView, setDiffView] = useState(false);

  const getSimpleDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const maxLen = Math.max(oldLines.length, newLines.length);
    const result: Array<{ type: "same" | "add" | "remove"; text: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === n) result.push({ type: "same", text: n ?? "" });
      else {
        if (o !== undefined) result.push({ type: "remove", text: o });
        if (n !== undefined) result.push({ type: "add", text: n });
      }
    }
    return result;
  };

  return (
    <div className="absolute right-2 top-12 z-50 w-80 max-h-[70vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
        <div className="flex items-center gap-1.5">
          <GitCommit size={12} style={{ color: "var(--color-obsidian-accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>Version History</span>
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>({versions.length})</span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10"
          style={{ color: "var(--color-obsidian-muted-text)" }}><X size={12} /></button>
      </div>
      {versions.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>No versions saved yet. Versions are created automatically when you edit.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {versions.map((v, i) => (
            <div key={v.id}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2"
                style={{ background: selectedIdx === i ? "var(--color-obsidian-selection-sm)" : "transparent" }}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "#a6e3a1" : "var(--color-obsidian-muted-text)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--color-obsidian-text)" }}>{v.title || "Untitled"}</p>
                  <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                    {new Date(v.savedAt).toLocaleString()} · {v.content.length} chars
                  </p>
                </div>
              </button>
              {selectedIdx === i && (
                <div className="px-3 pb-2">
                  <div className="flex gap-1 mb-2">
                    <button onClick={() => setDiffView(false)} className="px-2 py-0.5 rounded text-xs"
                      style={{ background: !diffView ? "var(--color-obsidian-accent)" : "var(--color-obsidian-bg)", color: !diffView ? "#fff" : "var(--color-obsidian-muted-text)" }}>
                      Preview
                    </button>
                    <button onClick={() => setDiffView(true)} className="px-2 py-0.5 rounded text-xs"
                      style={{ background: diffView ? "var(--color-obsidian-accent)" : "var(--color-obsidian-bg)", color: diffView ? "#fff" : "var(--color-obsidian-muted-text)" }}>
                      Diff
                    </button>
                    <button onClick={() => onRestore(v.content, v.title)} className="ml-auto px-2 py-0.5 rounded text-xs"
                      style={{ background: "rgba(166,227,161,0.15)", color: "#a6e3a1" }}>
                      Restore
                    </button>
                  </div>
                  {diffView ? (
                    <div className="max-h-40 overflow-y-auto rounded p-2 text-xs font-mono" style={{ background: "var(--color-obsidian-bg)", fontSize: "0.65rem" }}>
                      {getSimpleDiff(v.content, note.content).map((line, li) => (
                        <div key={li} style={{ color: line.type === "add" ? "#a6e3a1" : line.type === "remove" ? "#f38ba8" : "var(--color-obsidian-muted-text)" }}>
                          {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "} {line.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto rounded p-2 text-xs" style={{ background: "var(--color-obsidian-bg)", color: "var(--color-obsidian-text)", whiteSpace: "pre-wrap", fontSize: "0.65rem" }}>
                      {v.content.slice(0, 500)}{v.content.length > 500 ? "…" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
  onAddTag,
  installedPluginIds,
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
  onAddTag?: (tag: string) => void;
  installedPluginIds?: string[];
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");

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

    // Advanced Tables: Tab to next cell, Shift+Tab to prev cell, auto-format
    if (e.key === "Tab" && installedPluginIds?.includes("advanced-tables")) {
      const beforeCursor = value.substring(0, selectionStart);
      const currentLineStart = beforeCursor.lastIndexOf("\n") + 1;
      const currentLine = value.substring(currentLineStart, value.indexOf("\n", selectionStart) === -1 ? value.length : value.indexOf("\n", selectionStart));
      if (currentLine.trimStart().startsWith("|")) {
        e.preventDefault();
        const afterCursor = value.substring(selectionStart);
        if (e.shiftKey) {
          const prevPipe = beforeCursor.lastIndexOf("|", selectionStart - currentLineStart - 1 + currentLineStart);
          if (prevPipe >= currentLineStart) {
            setTimeout(() => ta.setSelectionRange(prevPipe + 2, prevPipe + 2), 0);
          }
        } else {
          const nextPipe = afterCursor.indexOf("|");
          if (nextPipe !== -1) {
            const newPos = selectionStart + nextPipe + 2;
            setTimeout(() => ta.setSelectionRange(newPos, newPos), 0);
          }
        }
      }
    }
  };

  // Link autocomplete detection + Natural Language Dates
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    const { selectionStart, value } = ta;

    // Natural Language Dates: replace @date patterns
    if (installedPluginIds?.includes("natural-language-dates")) {
      const dateMap: Record<string, () => string> = {
        "@today": () => new Date().toISOString().split("T")[0],
        "@tomorrow": () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; },
        "@yesterday": () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; },
        "@next-week": () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; },
        "@next-monday": () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.toISOString().split("T")[0]; },
        "@now": () => new Date().toLocaleTimeString(),
      };
      const beforeCursor = value.substring(0, selectionStart);
      for (const [pattern, getDate] of Object.entries(dateMap)) {
        if (beforeCursor.endsWith(pattern)) {
          const dateStr = getDate();
          const newValue = value.substring(0, selectionStart - pattern.length) + dateStr + value.substring(selectionStart);
          onNoteChange(newValue);
          adjustHeight();
          const newPos = selectionStart - pattern.length + dateStr.length;
          setTimeout(() => { ta.setSelectionRange(newPos, newPos); }, 0);
          return;
        }
      }
    }

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
      <div className="editor-content-area mx-auto px-10 pt-10 pb-20 md:pb-32" style={{ maxWidth: readableLength ? "48rem" : "none" }}>
        <input
          className="editor-title w-full bg-transparent outline-none text-3xl font-bold mb-1"
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
          {addingTag ? (
            <input
              autoFocus
              className="text-xs px-2 py-0.5 rounded-full bg-transparent outline-none w-24"
              style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-accent)" }}
              placeholder="tag name"
              value={newTagValue}
              onChange={(e) => setNewTagValue(e.target.value.replace(/\s/g, "-"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagValue.trim()) {
                  onAddTag?.(newTagValue.trim());
                  setNewTagValue(""); setAddingTag(false);
                }
                if (e.key === "Escape") { setNewTagValue(""); setAddingTag(false); }
              }}
              onBlur={() => {
                if (newTagValue.trim()) onAddTag?.(newTagValue.trim());
                setNewTagValue(""); setAddingTag(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed opacity-60 hover:opacity-100 transition-opacity focus:opacity-100"
              style={{ color: "var(--color-obsidian-muted-text)", borderColor: "var(--color-obsidian-border)" }}
            >
              + tag
            </button>
          )}
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
  onToggleCheckbox,
}: {
  note: Note;
  notes?: Note[];
  onWikilinkClick: (title: string) => void;
  onHoverLink?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  onToggleCheckbox?: (lineIndex: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="preview-content-area max-w-3xl mx-auto px-8 py-8">
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
          onToggleCheckbox={onToggleCheckbox}
        />
      </div>
    </div>
  );
}

// ─── Live Preview Pane (CodeMirror 6) ─────────────────────────────────────────

// --- CM6 Widgets ---

class HRWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.style.border = "none";
    hr.style.borderTop = "1px solid var(--color-obsidian-border)";
    hr.style.margin = "1.2em 0";
    return hr;
  }
  eq() { return true; }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super(); }
  toDOM(view: EditorView) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = this.checked;
    cb.style.cursor = "pointer";
    cb.style.verticalAlign = "middle";
    cb.style.marginRight = "6px";
    cb.style.accentColor = "var(--color-obsidian-accent)";
    cb.style.width = "15px";
    cb.style.height = "15px";
    cb.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(cb);
      const line = view.state.doc.lineAt(pos);
      const newText = this.checked
        ? line.text.replace("[x]", "[ ]")
        : line.text.replace("[ ]", "[x]");
      view.dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    });
    return cb;
  }
  eq(w: CheckboxWidget) { return this.checked === w.checked; }
  ignoreEvent() { return false; }
}

class WikilinkWidget extends WidgetType {
  constructor(readonly title: string, readonly display: string, readonly onClick: (t: string) => void) { super(); }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.display;
    span.style.color = "var(--color-obsidian-accent)";
    span.style.textDecoration = "underline";
    span.style.textDecorationStyle = "dotted";
    span.style.textUnderlineOffset = "3px";
    span.style.cursor = "pointer";
    span.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.onClick(this.title); });
    return span;
  }
  eq(w: WikilinkWidget) { return this.title === w.title && this.display === w.display; }
  ignoreEvent() { return false; }
}

// --- CM6 Theme ---

const livePreviewTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--color-obsidian-text)" },
  "&.cm-focused": { outline: "none" },
  ".cm-content": { caretColor: "var(--color-obsidian-accent)", fontFamily: "inherit", padding: "0" },
  ".cm-line": { padding: "0", lineHeight: "1.6" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-obsidian-accent)", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { background: "rgba(124,106,247,0.2) !important" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  "&.cm-focused .cm-activeLine": { backgroundColor: "rgba(124,106,247,0.04)" },
  ".cm-gutters": { display: "none" },
  ".cm-scroller": { overflow: "visible !important", fontFamily: "inherit" },
  // Decorated heading sizes (kept compact — title above already provides large display)
  ".cm-heading-1": { fontSize: "1.4em", fontWeight: "650", lineHeight: "1.3", letterSpacing: "-0.01em" },
  ".cm-heading-2": { fontSize: "1.22em", fontWeight: "600", lineHeight: "1.35", letterSpacing: "-0.005em" },
  ".cm-heading-3": { fontSize: "1.1em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-heading-4": { fontSize: "1em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-heading-5": { fontSize: "0.95em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-heading-6": { fontSize: "0.9em", fontWeight: "600", lineHeight: "1.4" },
  // Inline decoration classes
  ".cm-lp-strong": { fontWeight: "700" },
  ".cm-lp-em": { fontStyle: "italic" },
  ".cm-lp-strike": { textDecoration: "line-through" },
  ".cm-lp-code": {
    backgroundColor: "var(--color-obsidian-code-bg, rgba(0,0,0,0.15))",
    padding: "2px 5px", borderRadius: "4px",
    fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.85em",
  },
  ".cm-lp-link": { color: "var(--color-obsidian-accent)", textDecoration: "underline" },
  ".cm-lp-highlight": { backgroundColor: "rgba(255,213,0,0.25)", borderRadius: "2px", padding: "1px 0" },
  ".cm-blockquote-line": {
    borderLeft: "3px solid var(--color-obsidian-accent-soft, rgba(124,106,247,0.4))",
    paddingLeft: "16px !important", opacity: "0.85",
  },
  ".cm-codeblock-line": {
    backgroundColor: "var(--color-obsidian-code-bg, rgba(0,0,0,0.1))",
    fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.9em",
  },
  // Bullet point for list items
  ".cm-list-bullet::before": { content: '"•"', marginRight: "6px", color: "var(--color-obsidian-muted-text)" },
});

// --- CM6 Syntax highlight for raw mode (active line) ---

const obsidianHighlightStyle = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.heading1, fontSize: "2em", fontWeight: "700" },
  { tag: tags.heading2, fontSize: "1.6em", fontWeight: "600" },
  { tag: tags.heading3, fontSize: "1.37em", fontWeight: "600" },
  { tag: tags.heading4, fontSize: "1.1em", fontWeight: "600" },
  { tag: tags.heading5, fontWeight: "600" },
  { tag: tags.heading6, fontWeight: "600", fontSize: "0.85em" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.monospace, fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.9em" },
  { tag: tags.link, color: "var(--color-obsidian-accent)" },
  { tag: tags.url, color: "var(--color-obsidian-muted-text)", fontSize: "0.9em" },
  { tag: tags.meta, color: "var(--color-obsidian-muted-text)" },
  { tag: tags.quote, color: "var(--color-obsidian-muted-text)" },
  { tag: tags.processingInstruction, color: "var(--color-obsidian-muted-text)" },
  { tag: tags.contentSeparator, color: "var(--color-obsidian-muted-text)" },

  // ── Code-language tokens (Python, JS, etc. inside fenced blocks) ──────
  // These match the highlight.js palette used in the preview pane so the
  // editor and reading view feel consistent.
  { tag: [tags.keyword, tags.modifier, tags.self, tags.null], color: "#cba6f7" },
  { tag: [tags.controlKeyword, tags.operatorKeyword], color: "#cba6f7" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "#a6e3a1" },
  { tag: [tags.number, tags.bool, tags.atom], color: "#fab387" },
  { tag: tags.comment, color: "#6c7086", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#89b4fa" },
  { tag: [tags.className, tags.typeName, tags.namespace], color: "#f9e2af" },
  { tag: [tags.propertyName, tags.attributeName], color: "#89b4fa" },
  { tag: [tags.variableName, tags.labelName], color: "var(--color-obsidian-text)" },
  { tag: tags.definition(tags.variableName), color: "#f5c2e7" },
  { tag: [tags.operator, tags.punctuation, tags.bracket, tags.derefOperator], color: "var(--color-obsidian-muted-text)" },
  { tag: [tags.tagName, tags.angleBracket], color: "#74c7ec" },
  { tag: tags.escape, color: "#94e2d5" },
  { tag: tags.invalid, color: "#f38ba8" },
]));

// --- CM6 Live Preview Decoration Builder ---

function buildLiveDecorations(state: EditorState, onWikilinkClick: (t: string) => void): DecorationSet {
  const decs: { from: number; to: number; deco: Decoration }[] = [];
  const cursor = state.selection.main.head;
  const anchorLine = state.doc.lineAt(state.selection.main.anchor).number;
  const headLine = state.doc.lineAt(cursor).number;
  const activeLine1 = Math.min(anchorLine, headLine);
  const activeLine2 = Math.max(anchorLine, headLine);

  let inCodeBlock = false;

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const text = line.text;
    const trimmed = text.trim();

    // Track fenced code blocks
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        if (i < activeLine1 || i > activeLine2) {
          decs.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-codeblock-line" }) });
        }
        continue;
      } else {
        inCodeBlock = false;
        if (i < activeLine1 || i > activeLine2) {
          decs.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-codeblock-line" }) });
        }
        continue;
      }
    }
    if (inCodeBlock) {
      if (i < activeLine1 || i > activeLine2) {
        decs.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-codeblock-line" }) });
      }
      continue;
    }

    // Skip active lines — they show raw markdown
    if (i >= activeLine1 && i <= activeLine2) continue;

    // === BLOCK-LEVEL DECORATIONS ===

    // Horizontal Rule
    if (/^(---+|___+|\*\*\*+)\s*$/.test(trimmed)) {
      decs.push({ from: line.from, to: line.to, deco: Decoration.replace({ widget: new HRWidget() }) });
      continue;
    }

    // Headings: hide # marks, apply heading line style
    const headingMatch = text.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      decs.push({ from: line.from, to: line.from, deco: Decoration.line({ class: `cm-heading-${level}` }) });
      decs.push({ from: line.from, to: line.from + headingMatch[0].length, deco: Decoration.replace({}) });
    }

    // Blockquote: hide > marker, style line
    const quoteMatch = text.match(/^(\s*>+\s?)/);
    if (quoteMatch && !headingMatch) {
      decs.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-blockquote-line" }) });
      decs.push({ from: line.from, to: line.from + quoteMatch[0].length, deco: Decoration.replace({}) });
    }

    // Task checkbox: - [ ] or - [x]
    const taskMatch = text.match(/^(\s*[-*+])\s\[([ x])\]\s/);
    if (taskMatch) {
      const checked = taskMatch[2] === "x";
      const fullPrefixLen = taskMatch[0].length;
      decs.push({
        from: line.from,
        to: line.from + fullPrefixLen,
        deco: Decoration.replace({ widget: new CheckboxWidget(checked) }),
      });
    }

    // List bullet/number (non-task): hide marker, show bullet
    if (!taskMatch) {
      const listMatch = text.match(/^(\s*)([-*+])\s/);
      if (listMatch) {
        decs.push({
          from: line.from + listMatch[1].length,
          to: line.from + listMatch[0].length,
          deco: Decoration.replace({ widget: new ListBulletWidget() }),
        });
      }
    }

    // === INLINE DECORATIONS ===
    // Process inline patterns only for the non-prefix portion of the line
    // We need to be careful about overlapping decorations

    const inlineRanges: { from: number; to: number }[] = [];
    const addInline = (from: number, to: number, deco: Decoration) => {
      // Check for overlap with existing ranges
      for (const r of inlineRanges) {
        if (from < r.to && to > r.from) return; // overlaps, skip
      }
      inlineRanges.push({ from, to });
      decs.push({ from, to, deco });
    };

    // Wikilinks: [[title]] or [[title|display]]
    const wikiRe = /\[\[([^\]]+)\]\]/g;
    let wm;
    while ((wm = wikiRe.exec(text)) !== null) {
      const f = line.from + wm.index;
      const t = f + wm[0].length;
      const parts = wm[1].split("|");
      const title = parts[0].trim();
      const display = parts.length > 1 ? parts[1].trim() : title;
      // Replace entire [[...]] with clickable widget
      for (const r of inlineRanges) { if (f < r.to && t > r.from) continue; }
      inlineRanges.push({ from: f, to: t });
      decs.push({ from: f, to: t, deco: Decoration.replace({ widget: new WikilinkWidget(title, display, onWikilinkClick) }) });
    }

    // Bold: **text**
    const boldRe = /\*\*(.+?)\*\*/g;
    let bm;
    while ((bm = boldRe.exec(text)) !== null) {
      const f = line.from + bm.index;
      const t = f + bm[0].length;
      addInline(f, f + 2, Decoration.replace({})); // hide opening **
      addInline(t - 2, t, Decoration.replace({})); // hide closing **
      addInline(f + 2, t - 2, Decoration.mark({ class: "cm-lp-strong" }));
    }

    // Italic: *text* (but not **)
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    let im;
    while ((im = italicRe.exec(text)) !== null) {
      const f = line.from + im.index;
      const t = f + im[0].length;
      addInline(f, f + 1, Decoration.replace({}));
      addInline(t - 1, t, Decoration.replace({}));
      addInline(f + 1, t - 1, Decoration.mark({ class: "cm-lp-em" }));
    }

    // Strikethrough: ~~text~~
    const strikeRe = /~~(.+?)~~/g;
    let sm;
    while ((sm = strikeRe.exec(text)) !== null) {
      const f = line.from + sm.index;
      const t = f + sm[0].length;
      addInline(f, f + 2, Decoration.replace({}));
      addInline(t - 2, t, Decoration.replace({}));
      addInline(f + 2, t - 2, Decoration.mark({ class: "cm-lp-strike" }));
    }

    // Inline code: `code`
    const codeRe = /`([^`]+)`/g;
    let cm;
    while ((cm = codeRe.exec(text)) !== null) {
      const f = line.from + cm.index;
      const t = f + cm[0].length;
      addInline(f, f + 1, Decoration.replace({}));
      addInline(t - 1, t, Decoration.replace({}));
      addInline(f + 1, t - 1, Decoration.mark({ class: "cm-lp-code" }));
    }

    // Highlight: ==text==
    const hlRe = /==(.+?)==/g;
    let hm;
    while ((hm = hlRe.exec(text)) !== null) {
      const f = line.from + hm.index;
      const t = f + hm[0].length;
      addInline(f, f + 2, Decoration.replace({}));
      addInline(t - 2, t, Decoration.replace({}));
      addInline(f + 2, t - 2, Decoration.mark({ class: "cm-lp-highlight" }));
    }

    // Markdown links: [text](url) — but not images ![alt](url) and not wiki [[
    const linkRe = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
    let lm;
    while ((lm = linkRe.exec(text)) !== null) {
      const f = line.from + lm.index;
      const t = f + lm[0].length;
      const textEnd = f + 1 + lm[1].length;
      addInline(f, f + 1, Decoration.replace({}));             // hide [
      addInline(f + 1, textEnd, Decoration.mark({ class: "cm-lp-link" })); // style text
      addInline(textEnd, t, Decoration.replace({}));             // hide ](url)
    }
  }

  // Sort decorations: line decorations first (they have from===to at line start),
  // then by position. CM6 requires sorted, non-overlapping decorations.
  decs.sort((a, b) => a.from - b.from || a.to - b.to);

  try {
    return Decoration.set(decs.map(d => d.deco.range(d.from, d.to)), true);
  } catch {
    return Decoration.none;
  }
}

// Small widget for list bullets
class ListBulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "• ";
    span.style.color = "var(--color-obsidian-muted-text)";
    return span;
  }
  eq() { return true; }
}

// --- CM6 Smart-Enter for list continuation ---

function smartListEnter(view: EditorView): boolean {
  const { state } = view;
  const { head } = state.selection.main;
  const line = state.doc.lineAt(head);
  const text = line.text;

  const taskMatch = text.match(/^(\s*)([-*+])\s\[([ x])\]\s(.*)$/);
  const bulletMatch = text.match(/^(\s*)([-*+])\s(.*)$/);
  const numberedMatch = text.match(/^(\s*)(\d+)\.\s(.*)$/);

  if (taskMatch) {
    if (taskMatch[4] === "" && head >= line.to - taskMatch[4].length) {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return true;
    }
    const prefix = `${taskMatch[1]}${taskMatch[2]} [ ] `;
    view.dispatch({
      changes: { from: head, insert: "\n" + prefix },
      selection: { anchor: head + 1 + prefix.length },
    });
    return true;
  }

  if (bulletMatch && !taskMatch) {
    if (bulletMatch[3] === "" && head >= line.to - bulletMatch[3].length) {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return true;
    }
    const prefix = `${bulletMatch[1]}${bulletMatch[2]} `;
    view.dispatch({
      changes: { from: head, insert: "\n" + prefix },
      selection: { anchor: head + 1 + prefix.length },
    });
    return true;
  }

  if (numberedMatch) {
    if (numberedMatch[3] === "" && head >= line.to - numberedMatch[3].length) {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return true;
    }
    const nextNum = parseInt(numberedMatch[2]) + 1;
    const prefix = `${numberedMatch[1]}${nextNum}. `;
    view.dispatch({
      changes: { from: head, insert: "\n" + prefix },
      selection: { anchor: head + 1 + prefix.length },
    });
    return true;
  }

  return false;
}

// --- CM6 Wikilink autocompletion ---

function wikilinkCompletionSource(notes: Note[]): CompletionSource {
  return (context: CompletionContext) => {
    const before = context.matchBefore(/\[\[([^\]]*)$/);
    if (!before) return null;
    const filter = before.text.slice(2);
    return {
      from: before.from + 2,
      to: context.pos,
      options: notes
        .filter(n => !n.trashed && n.title.toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 20)
        .map(n => ({
          label: n.title,
          apply: (view: EditorView, _c: unknown, from: number, to: number) => {
            view.dispatch({ changes: { from, to, insert: `${n.title}]]` } });
          },
        })),
    };
  };
}

// --- CM6 create extensions factory ---

function createLivePreviewExtensions(
  onContentChange: (content: string) => void,
  onWikilinkClick: (title: string) => void,
  notes: Note[],
  fontSize: number,
  spellCheck: boolean,
): Extension[] {
  const liveDecoField = StateField.define<DecorationSet>({
    create(state) { return buildLiveDecorations(state, onWikilinkClick); },
    update(decos, tr) {
      if (tr.docChanged || tr.selection) {
        return buildLiveDecorations(tr.state, onWikilinkClick);
      }
      return decos;
    },
    provide: f => EditorView.decorations.from(f),
  });

  return [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    liveDecoField,
    livePreviewTheme,
    obsidianHighlightStyle,
    history(),
    closeBrackets(),
    autocompletion({ override: [wikilinkCompletionSource(notes)] }),
    keymap.of([
      { key: "Enter", run: smartListEnter },
      ...closeBracketsKeymap,
      ...historyKeymap,
      ...defaultKeymap,
    ]),
    EditorView.lineWrapping,
    EditorState.allowMultipleSelections.of(false),
    EditorView.contentAttributes.of({ spellcheck: spellCheck ? "true" : "false" }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        onContentChange(update.state.doc.toString());
      }
    }),
    EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
  ];
}

// --- LivePreviewPane Component ---

function LivePreviewPane({
  note,
  notes,
  onContentChange,
  onTitleChange,
  onWikilinkClick,
  onHoverLink,
  onHoverEnd,
  onToggleCheckbox,
  onAddTag,
  preferences,
  onLinkAutocomplete,
  onCloseAutocomplete,
  installedPluginIds,
}: {
  note: Note;
  notes: Note[];
  onContentChange: (v: string) => void;
  onTitleChange: (title: string) => void;
  onWikilinkClick: (title: string) => void;
  onHoverLink?: (title: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  onToggleCheckbox?: (lineIndex: number) => void;
  onAddTag?: (tag: string) => void;
  preferences?: AppState["preferences"];
  onLinkAutocomplete?: (data: { filter: string; position: { top: number; left: number } } | null) => void;
  onCloseAutocomplete?: () => void;
  installedPluginIds?: string[];
}) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(note.content);
  const noteIdRef = useRef(note.id);

  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");

  const fontSize = preferences?.fontSize ?? 16;
  const readableLength = preferences?.readableLineLength ?? true;
  const spellCheckEnabled = preferences?.spellCheck ?? false;

  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  const onWikilinkClickRef = useRef(onWikilinkClick);
  onWikilinkClickRef.current = onWikilinkClick;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Create / destroy CM6 editor when the note changes
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    // Stable callbacks that read from refs
    const stableContentChange = (c: string) => {
      contentRef.current = c;
      onContentChangeRef.current(c);
    };
    const stableWikilinkClick = (t: string) => onWikilinkClickRef.current(t);

    const extensions = createLivePreviewExtensions(
      stableContentChange,
      stableWikilinkClick,
      notesRef.current,
      fontSize,
      spellCheckEnabled,
    );

    const state = EditorState.create({ doc: note.content, extensions });
    const view = new EditorView({ state, parent: container });
    viewRef.current = view;
    contentRef.current = note.content;
    noteIdRef.current = note.id;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate editor when note ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Sync external content changes (e.g. sync from Firestore)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || noteIdRef.current !== note.id) return;
    if (contentRef.current === note.content) return;
    contentRef.current = note.content;
    const currentLen = view.state.doc.length;
    view.dispatch({ changes: { from: 0, to: currentLen, insert: note.content } });
  }, [note.content, note.id]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="editor-content-area mx-auto px-10 pt-12 pb-20 md:pb-32" style={{ maxWidth: readableLength ? "48rem" : "none" }}>
        {/* Title */}
        <input
          className="editor-title w-full bg-transparent outline-none mb-2"
          style={{
            color: "var(--color-obsidian-text)",
            fontSize: "2.25rem",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
          }}
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
        />
        {/* Tags */}
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
          {addingTag ? (
            <input
              autoFocus
              className="text-xs px-2 py-0.5 rounded-full bg-transparent outline-none w-24"
              style={{ color: "var(--color-obsidian-text)", border: "1px solid var(--color-obsidian-accent)" }}
              placeholder="tag name"
              value={newTagValue}
              onChange={(e) => setNewTagValue(e.target.value.replace(/\s/g, "-"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagValue.trim()) {
                  onAddTag?.(newTagValue.trim());
                  setNewTagValue(""); setAddingTag(false);
                }
                if (e.key === "Escape") { setNewTagValue(""); setAddingTag(false); }
              }}
              onBlur={() => {
                if (newTagValue.trim()) onAddTag?.(newTagValue.trim());
                setNewTagValue(""); setAddingTag(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed opacity-60 hover:opacity-100 transition-opacity focus:opacity-100"
              style={{ color: "var(--color-obsidian-muted-text)", borderColor: "var(--color-obsidian-border)" }}
            >
              + tag
            </button>
          )}
        </div>
        {/* Frontmatter */}
        <FrontmatterEditor content={note.content} onContentChange={onContentChange} />
        {/* CM6 Editor */}
        <div ref={editorContainerRef} className="cm-live-preview-container" />
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

interface KanbanCard { id: string; title: string }
interface KanbanColumn { id: string; label: string; color: string; cards: KanbanCard[] }
interface KanbanBoard { columns: KanbanColumn[] }

const DEFAULT_KANBAN_BOARD: KanbanBoard = {
  columns: [
    { id: "col-todo", label: "To Do", color: "#89b4fa", cards: [] },
    { id: "col-progress", label: "In Progress", color: "#f9e2af", cards: [] },
    { id: "col-done", label: "Done", color: "#a6e3a1", cards: [] },
  ],
};

function parseKanbanBoard(content: string): KanbanBoard {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.columns)) return parsed;
  } catch { /* not JSON yet */ }
  return DEFAULT_KANBAN_BOARD;
}

function KanbanView({ note, onNoteChange }: { note: Note; onNoteChange: (id: string, patch: Partial<Note>) => void }) {
  const board = parseKanbanBoard(note.content);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  const updateBoard = (b: KanbanBoard) => {
    onNoteChange(note.id, { content: JSON.stringify(b), updatedAt: new Date().toISOString().split("T")[0] });
  };

  const addCard = (colId: string) => {
    if (!newCardTitle.trim()) return;
    updateBoard({ ...board, columns: board.columns.map(c =>
      c.id === colId ? { ...c, cards: [...c.cards, { id: `card-${Date.now()}`, title: newCardTitle.trim() }] } : c
    ) });
    setNewCardTitle(""); setAddingCardCol(null);
  };

  const deleteCard = (colId: string, cardId: string) => {
    updateBoard({ ...board, columns: board.columns.map(c =>
      c.id === colId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c
    ) });
  };

  const saveCardTitle = (colId: string, cardId: string) => {
    if (!editCardTitle.trim()) { setEditingCard(null); return; }
    updateBoard({ ...board, columns: board.columns.map(c =>
      c.id === colId ? { ...c, cards: c.cards.map(k => k.id === cardId ? { ...k, title: editCardTitle.trim() } : k) } : c
    ) });
    setEditingCard(null);
  };

  const moveCard = (fromColId: string, cardId: string, direction: number) => {
    const ci = board.columns.findIndex(c => c.id === fromColId);
    const ti = ci + direction;
    if (ti < 0 || ti >= board.columns.length) return;
    const card = board.columns[ci].cards.find(k => k.id === cardId);
    if (!card) return;
    updateBoard({ ...board, columns: board.columns.map((c, i) => {
      if (i === ci) return { ...c, cards: c.cards.filter(k => k.id !== cardId) };
      if (i === ti) return { ...c, cards: [...c.cards, card] };
      return c;
    }) });
  };

  const addColumn = () => {
    if (!newColLabel.trim()) return;
    const palette = ["#89b4fa", "#f9e2af", "#a6e3a1", "#cba6f7", "#f38ba8", "#fab387", "#94e2d5"];
    updateBoard({ ...board, columns: [...board.columns, {
      id: `col-${Date.now()}`, label: newColLabel.trim(),
      color: palette[board.columns.length % palette.length], cards: [],
    }] });
    setNewColLabel(""); setAddingColumn(false);
  };

  const deleteColumn = (colId: string) => {
    updateBoard({ ...board, columns: board.columns.filter(c => c.id !== colId) });
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-6 h-full min-w-max">
        {board.columns.map((col, colIdx) => (
          <div key={col.id} className="w-64 flex flex-col rounded-xl overflow-hidden shrink-0"
            style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}>
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>{col.label}</span>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: `${col.color}20`, color: col.color }}>{col.cards.length}</span>
                <button onClick={() => deleteColumn(col.id)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  style={{ color: "var(--color-obsidian-muted-text)" }}><X size={12} /></button>
              </div>
            </div>
            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {col.cards.map((card) => (
                <div key={card.id} className="group p-2.5 rounded-lg transition-colors"
                  style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
                  {editingCard === card.id ? (
                    <input autoFocus className="w-full bg-transparent outline-none text-xs"
                      style={{ color: "var(--color-obsidian-text)" }}
                      value={editCardTitle}
                      onChange={(e) => setEditCardTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCardTitle(col.id, card.id); if (e.key === "Escape") setEditingCard(null); }}
                      onBlur={() => saveCardTitle(col.id, card.id)} />
                  ) : (
                    <p className="text-xs font-medium cursor-pointer"
                      style={{ color: "var(--color-obsidian-text)" }}
                      onClick={() => { setEditingCard(card.id); setEditCardTitle(card.title); }}>{card.title}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {colIdx > 0 && (
                      <button onClick={() => moveCard(col.id, card.id, -1)}
                        className="p-0.5 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-muted-text)" }}>
                        <ArrowLeft size={11} /></button>
                    )}
                    {colIdx < board.columns.length - 1 && (
                      <button onClick={() => moveCard(col.id, card.id, 1)}
                        className="p-0.5 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-muted-text)" }}>
                        <ArrowRight size={11} /></button>
                    )}
                    <button onClick={() => deleteCard(col.id, card.id)}
                      className="ml-auto p-0.5 rounded hover:bg-white/10" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      <Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              {addingCardCol === col.id ? (
                <div className="p-2 rounded-lg" style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
                  <input autoFocus className="w-full bg-transparent outline-none text-xs mb-2"
                    style={{ color: "var(--color-obsidian-text)" }}
                    placeholder="Card title..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCard(col.id); if (e.key === "Escape") { setAddingCardCol(null); setNewCardTitle(""); } }} />
                  <div className="flex gap-1">
                    <button onClick={() => addCard(col.id)}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}>Add</button>
                    <button onClick={() => { setAddingCardCol(null); setNewCardTitle(""); }}
                      className="px-2 py-1 rounded text-xs"
                      style={{ color: "var(--color-obsidian-muted-text)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingCardCol(col.id); setNewCardTitle(""); }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs w-full hover:bg-white/5 transition-colors"
                  style={{ color: "var(--color-obsidian-muted-text)", border: "1px dashed var(--color-obsidian-border)" }}>
                  <Plus size={11} /> Add card
                </button>
              )}
            </div>
          </div>
        ))}
        {/* Add column */}
        {addingColumn ? (
          <div className="w-64 shrink-0 p-3 rounded-xl"
            style={{ background: "var(--color-obsidian-surface)", border: "1px dashed var(--color-obsidian-border)" }}>
            <input autoFocus className="w-full bg-transparent outline-none text-xs mb-2"
              style={{ color: "var(--color-obsidian-text)" }}
              placeholder="Column name..."
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addColumn(); if (e.key === "Escape") { setAddingColumn(false); setNewColLabel(""); } }} />
            <div className="flex gap-1">
              <button onClick={addColumn}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}>Add</button>
              <button onClick={() => { setAddingColumn(false); setNewColLabel(""); }}
                className="px-2 py-1 rounded text-xs"
                style={{ color: "var(--color-obsidian-muted-text)" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingColumn(true)}
            className="w-64 shrink-0 h-20 flex items-center justify-center gap-2 rounded-xl text-xs hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)", border: "1px dashed var(--color-obsidian-border)" }}>
            <Plus size={14} /> Add column
          </button>
        )}
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
        className="empty-state-shortcuts grid grid-cols-3 gap-3 text-xs text-center"
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
  dirtyNoteIds,
}: EditorProps) {
  const { notes, activeNoteId, openNoteIds } = state;
  // On mobile, force split view to live mode
  const viewMode = isMobile && state.viewMode === "editor" ? "live" : state.viewMode;
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ title: string; rect: DOMRect } | null>(null);
  const [linkAutocomplete, setLinkAutocomplete] = useState<{ filter: string; position: { top: number; left: number } } | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showGitHistory, setShowGitHistory] = useState(false);

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

  const handleToggleCheckbox = useCallback((lineIndex: number) => {
    if (!activeNote) return;
    const lines = activeNote.content.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const line = lines[lineIndex];
    if (line.includes("[ ] ")) {
      lines[lineIndex] = line.replace("[ ] ", "[x] ");
    } else if (line.includes("[x] ")) {
      lines[lineIndex] = line.replace("[x] ", "[ ] ");
    } else {
      return;
    }
    handleContentChange(lines.join("\n"));
  }, [activeNote, handleContentChange]);

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

    // Sliding Panes: show all open notes side-by-side
    if (state.slidingPanesEnabled && state.installedPluginIds.includes("sliding-panes") && openNoteIds.length > 1) {
      const openNotes = openNoteIds.map((id) => notes.find((n) => n.id === id)).filter(Boolean) as Note[];
      return (
        <div className="flex-1 flex overflow-x-auto" style={{ scrollSnapType: "x mandatory" }}>
          {openNotes.map((paneNote) => (
            <div key={paneNote.id} className="shrink-0 flex flex-col overflow-hidden"
              style={{
                width: `${Math.max(320, Math.min(480, window.innerWidth / openNotes.length))}px`,
                scrollSnapAlign: "start",
                borderRight: "1px solid var(--color-obsidian-border)",
                background: paneNote.id === activeNoteId ? "var(--color-obsidian-bg)" : "var(--color-obsidian-surface)",
              }}>
              <button onClick={() => onStateChange({ activeNoteId: paneNote.id })}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{ borderBottom: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-text)" }}>
                <FileText size={11} />
                <span className="truncate font-medium">{paneNote.title}</span>
              </button>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="prose-sm" style={{ color: "var(--color-obsidian-text)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {paneNote.content || "Empty note"}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

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

    // Canvas note — render visual canvas instead of raw JSON
    if (activeNote.type === "canvas") {
      return (
        <CanvasView
          note={activeNote}
          allNotes={notes}
          onChange={(content) => onNoteChange(activeNote.id, { content })}
          onNoteClick={onNoteClick}
        />
      );
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
      return <KanbanView note={activeNote} onNoteChange={onNoteChange} />;
    }

    // Markdown — live/editor/preview
    if (viewMode === "live") {
      return (
        <LivePreviewPane
          note={activeNote}
          notes={notes}
          onContentChange={handleContentChange}
          onTitleChange={handleTitleChange}
          onWikilinkClick={handleWikilinkClick}
          onHoverLink={handleHoverLink}
          onHoverEnd={handleHoverEnd}
          onToggleCheckbox={handleToggleCheckbox}
          onAddTag={(tag) => { if (!activeNote.tags.includes(tag)) onNoteChange(activeNote.id, { tags: [...activeNote.tags, tag] }); }}
          preferences={state.preferences}
          onLinkAutocomplete={setLinkAutocomplete}
          onCloseAutocomplete={() => setLinkAutocomplete(null)}
          installedPluginIds={state.installedPluginIds}
        />
      );
    }
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
          onAddTag={(tag) => { if (!activeNote.tags.includes(tag)) onNoteChange(activeNote.id, { tags: [...activeNote.tags, tag] }); }}
          installedPluginIds={state.installedPluginIds}
        />
      );
    }
    // preview (reading mode)
    return (
      <PreviewPane
        note={activeNote}
        notes={notes}
        onWikilinkClick={handleWikilinkClick}
        onHoverLink={handleHoverLink}
        onHoverEnd={handleHoverEnd}
        onToggleCheckbox={handleToggleCheckbox}
      />
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
          dirtyNoteIds={dirtyNoteIds}
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
          isMobile={isMobile}
          installedPluginIds={state.installedPluginIds}
          onTogglePomodoro={() => onStateChange({ pomodoro: state.pomodoro ? undefined : { running: false, mode: "work", secondsLeft: 25 * 60, sessions: 0, workMinutes: 25, breakMinutes: 5 } })}
          onToggleAIPanel={() => setShowAIPanel((v) => !v)}
          onToggleGitHistory={() => setShowGitHistory((v) => !v)}
          onToggleSlidingPanes={() => onStateChange({ slidingPanesEnabled: !state.slidingPanesEnabled })}
          slidingPanesActive={!!state.slidingPanesEnabled}
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
      {/* Plugin quick-access bar — shows installed plugin shortcuts */}
      {!isMobile && activeNote && activeNote.type !== "drawing" && (() => {
        const plugins = state.installedPluginIds.filter((id) => !["excalidraw", "obsidian-kanban"].includes(id));
        if (plugins.length === 0) return null;
        const items: Array<{ id: string; icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = [];
        if (plugins.includes("pomodoro")) {
          items.push({ id: "pomodoro", icon: <Timer size={11} />, label: "Pomodoro Timer", active: !!state.pomodoro,
            onClick: () => onStateChange({ pomodoro: state.pomodoro ? undefined : { running: false, mode: "work", secondsLeft: 25 * 60, sessions: 0, workMinutes: 25, breakMinutes: 5 } }) });
        }
        if (plugins.includes("ai-assistant")) {
          items.push({ id: "ai", icon: <Sparkles size={11} />, label: "Writing Analytics", active: showAIPanel,
            onClick: () => setShowAIPanel((v) => !v) });
        }
        if (plugins.includes("obsidian-git")) {
          items.push({ id: "git", icon: <GitCommit size={11} />, label: "Version History", active: showGitHistory,
            onClick: () => setShowGitHistory((v) => !v) });
        }
        if (plugins.includes("obsidian-publish-plus")) {
          items.push({ id: "publish", icon: <Globe size={11} />, label: "Export as HTML", active: false,
            onClick: () => { if (activeNote) exportNoteAsHTML(activeNote); } });
        }
        if (plugins.includes("citations")) {
          items.push({ id: "cite", icon: <BookOpen size={11} />, label: "Insert Citation", active: false,
            onClick: () => {
              if (!activeNote) return;
              const content = activeNote.content;
              const hasBib = content.includes("## References");
              let newContent = content;
              if (!hasBib) {
                newContent += `\n\n## References\n\n- [@authorYear] Author, A. (Year). *Title*. Journal, Volume(Issue), Pages.`;
              }
              onNoteChange(activeNote.id, { content: newContent });
            } });
        }
        if (plugins.includes("sliding-panes")) {
          items.push({ id: "sliding", icon: <FlipHorizontal size={11} />, label: "Sliding Panes", active: !!state.slidingPanesEnabled,
            onClick: () => onStateChange({ slidingPanesEnabled: !state.slidingPanesEnabled }) });
        }
        if (items.length === 0) return null;
        return (
          <div className="flex items-center gap-1 px-3 py-0.5 shrink-0"
            style={{ borderTop: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}>
            <span className="text-xs mr-1" style={{ color: "var(--color-obsidian-muted-text)", fontSize: "0.6rem" }}>PLUGINS</span>
            {items.map((item) => (
              <button key={item.id} onClick={item.onClick}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:bg-white/10 transition-colors"
                style={{
                  color: item.active ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                  background: item.active ? "rgba(124,106,247,0.1)" : "transparent",
                }}
                title={item.label}>
                {item.icon}
                <span style={{ fontSize: "0.65rem" }}>{item.label}</span>
              </button>
            ))}
          </div>
        );
      })()}
      {!isMobile && <StatusBar note={activeNote} wordCount={wordCount} />}
      {/* Plugin panels */}
      {showAIPanel && activeNote && state.installedPluginIds.includes("ai-assistant") && (
        <AIWritingPanel note={activeNote} onClose={() => setShowAIPanel(false)} />
      )}
      {showGitHistory && activeNote && state.installedPluginIds.includes("obsidian-git") && (
        <GitHistoryPanel note={activeNote} onClose={() => setShowGitHistory(false)}
          onRestore={(content, title) => { onNoteChange(activeNote.id, { content, title }); setShowGitHistory(false); }} />
      )}
      {state.pomodoro && state.installedPluginIds.includes("pomodoro") && (
        <PomodoroWidget state={state} onStateChange={onStateChange} />
      )}
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
