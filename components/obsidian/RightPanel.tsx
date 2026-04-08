"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link2, List, Info, ExternalLink, Tag, Calendar, Share2, ChevronLeft, ChevronRight, GitBranch, RotateCcw, Eye, X, Plus, Minus, Brain, BookOpen, Flame } from "lucide-react";
import { Note, NoteVersion, AppState, getBacklinks, extractWikilinks, getNoteByTitle } from "./data";
import { diffLines, type Change } from "diff";

// ─── Dynamic tab list based on installed plugins ──────────────────────────────

function getTabs(installedPluginIds: string[]) {
  const base: Array<{ id: TabId; icon: React.ElementType; label: string }> = [
    { id: "backlinks", icon: Link2, label: "Backlinks" },
    { id: "outline", icon: List, label: "Outline" },
    { id: "properties", icon: Info, label: "Properties" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
    { id: "localgraph", icon: Share2, label: "Local Graph" },
  ];
  if (installedPluginIds.includes("heatmap-calendar")) {
    base.push({ id: "heatmap", icon: Flame, label: "Heatmap" });
  }
  if (installedPluginIds.includes("spaced-repetition")) {
    base.push({ id: "flashcards", icon: BookOpen, label: "Flashcards" });
  }
  if (installedPluginIds.includes("mind-map")) {
    base.push({ id: "mindmap", icon: Brain, label: "Mind Map" });
  }
  return base;
}

interface RightPanelProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onNoteClick: (id: string) => void;
  onRestoreVersion?: (noteId: string, versionId: string) => void;
  onNewDailyNote?: (date: Date) => void;
}

type TabId = "backlinks" | "outline" | "properties" | "calendar" | "localgraph" | "heatmap" | "flashcards" | "mindmap";

// ─── Backlinks Tab ────────────────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

function BacklinksTab({
  note,
  notes,
  onNoteClick,
}: {
  note: Note;
  notes: Note[];
  onNoteClick: (id: string) => void;
}) {
  const backlinks = getBacklinks(notes, note);
  if (backlinks.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <Link2
          size={24}
          className="mx-auto mb-2 opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        />
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No notes link to this page yet.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Use{" "}
          <code
            className="px-1 rounded"
            style={{
              background: "var(--color-obsidian-code-bg)",
              color: "var(--color-obsidian-code-text)",
              fontSize: "0.8em",
            }}
          >
            [[{note.title}]]
          </code>{" "}
          in another note to create a backlink.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <p
        className="text-xs px-2 pb-1"
        style={{ color: "var(--color-obsidian-muted-text)" }}
      >
        {backlinks.length} note{backlinks.length !== 1 ? "s" : ""} link here
      </p>
      {backlinks.map((bl) => {
        // Find context snippet using module-level regex
        let snippet = "";
        for (const m of bl.content.matchAll(WIKILINK_RE)) {
          if (m[1].toLowerCase() === note.title.toLowerCase()) {
            const start = Math.max(0, m.index - 40);
            const end = Math.min(bl.content.length, m.index + m[0].length + 40);
            snippet = (start > 0 ? "…" : "") + bl.content.slice(start, end) + (end < bl.content.length ? "…" : "");
            break;
          }
        }

        return (
          <button
            key={bl.id}
            onClick={() => onNoteClick(bl.id)}
            className="text-left px-2 py-2 rounded-md hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <ExternalLink size={11} style={{ color: "var(--color-obsidian-link)", flexShrink: 0 }} />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-obsidian-link)" }}
              >
                {bl.title}
              </span>
            </div>
            {snippet && (
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              >
                {snippet}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Outline Tab ──────────────────────────────────────────────────────────────

function OutlineTab({ note }: { note: Note }) {
  const headings: { level: number; text: string; key: number }[] = [];
  note.content.split("\n").forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      headings.push({ level: m[1].length, text: m[2], key: i });
    }
  });

  if (headings.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <List
          size={24}
          className="mx-auto mb-2 opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        />
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No headings found in this note.
        </p>
      </div>
    );
  }

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {headings.map((h) => (
        <div
          key={h.key}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
          style={{ paddingLeft: `${(h.level - minLevel) * 12 + 8}px` }}
        >
          <span
            className="text-xs opacity-40 font-mono shrink-0"
            style={{ color: "var(--color-obsidian-accent)" }}
          >
            {"#".repeat(h.level)}
          </span>
          <span
            className="text-xs truncate"
            style={{ color: "var(--color-obsidian-text)" }}
          >
            {h.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Properties Tab ───────────────────────────────────────────────────────────

function PropertiesTab({
  note,
  notes,
  onNoteClick,
  onRestoreVersion,
}: {
  note: Note;
  notes: Note[];
  onNoteClick: (id: string) => void;
  onRestoreVersion?: (noteId: string, versionId: string) => void;
}) {
  const outlinks = extractWikilinks(note.content)
    .map((title) => getNoteByTitle(notes, title))
    .filter(Boolean) as Note[];
  const historyItems = note.versionHistory ?? [];

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Metadata */}
      <div
        className="rounded-lg p-3 flex flex-col gap-2"
        style={{
          background: "var(--color-obsidian-bg)",
          border: "1px solid var(--color-obsidian-border)",
        }}
      >
        <Row label="Created" value={note.createdAt} />
        <Row label="Modified" value={note.updatedAt} />
        <Row label="Words" value={note.content.trim().split(/\s+/).length.toString()} />
        <Row label="Folder" value={note.folder} />
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold mb-2 flex items-center gap-1"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <Tag size={11} /> Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: "var(--color-obsidian-tag-bg)",
                  color: "var(--color-obsidian-tag)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing links */}
      {outlinks.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold mb-2 flex items-center gap-1"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <Link2 size={11} /> Links out ({outlinks.length})
          </p>
          <div className="flex flex-col gap-1">
            {outlinks.map((n) => (
              <button
                key={n.id}
                onClick={() => onNoteClick(n.id)}
                className="text-left text-xs px-2 py-1 rounded-md hover:bg-white/5 transition-colors truncate"
                style={{ color: "var(--color-obsidian-link)" }}
              >
                {n.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Version history */}
      <VersionHistorySection
        note={note}
        historyItems={historyItems}
        onRestoreVersion={onRestoreVersion}
      />
    </div>
  );
}

// ─── Version History Section (Git-like) ───────────────────────────────────────

function getDiffStats(oldText: string, newText: string): { added: number; removed: number; changes: Change[] } {
  const changes = diffLines(oldText, newText);
  let added = 0;
  let removed = 0;
  changes.forEach((c) => {
    const lineCount = c.count ?? 0;
    if (c.added) added += lineCount;
    if (c.removed) removed += lineCount;
  });
  return { added, removed, changes };
}

function DiffViewer({ oldText, newText, onClose }: { oldText: string; newText: string; onClose: () => void }) {
  const changes = diffLines(oldText, newText);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: "var(--color-obsidian-surface)", border: "1px solid var(--color-obsidian-border)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <span className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--color-obsidian-text)" }}>
            <GitBranch size={14} /> Diff View
          </span>
          <button onClick={onClose} className="p-1 rounded hover:opacity-80" style={{ color: "var(--color-obsidian-muted-text)" }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
          <pre className="text-xs leading-relaxed" style={{ fontFamily: "'Geist Mono', 'Fira Code', monospace", margin: 0 }}>
            {changes.map((change, i) => {
              const lines = change.value.split("\n");
              // Remove trailing empty line from split
              if (lines[lines.length - 1] === "") lines.pop();

              return lines.map((line, j) => {
                const bg = change.added
                  ? "rgba(166,227,161,0.12)"
                  : change.removed
                  ? "rgba(243,139,168,0.12)"
                  : "transparent";
                const color = change.added
                  ? "#a6e3a1"
                  : change.removed
                  ? "#f38ba8"
                  : "var(--color-obsidian-text)";
                const prefix = change.added ? "+" : change.removed ? "-" : " ";
                return (
                  <div
                    key={`${i}-${j}`}
                    className="px-4 py-0.5"
                    style={{ background: bg, color, minHeight: "1.4em" }}
                  >
                    <span className="opacity-50 select-none mr-3">{prefix}</span>
                    {line || "\u00A0"}
                  </div>
                );
              });
            })}
          </pre>
        </div>
      </div>
    </div>
  );
}

function VersionHistorySection({
  note,
  historyItems,
  onRestoreVersion,
}: {
  note: Note;
  historyItems: NoteVersion[];
  onRestoreVersion?: (noteId: string, versionId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffViewVersion, setDiffViewVersion] = useState<NoteVersion | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll ? historyItems : historyItems.slice(0, 10);

  return (
    <div>
      <p
        className="text-xs font-semibold mb-2 flex items-center gap-1"
        style={{ color: "var(--color-obsidian-muted-text)" }}
      >
        <GitBranch size={11} /> Version History ({historyItems.length})
      </p>
      {historyItems.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No saved versions yet. Versions are captured on content edits.
        </p>
      ) : (
        <>
          {/* Timeline */}
          <div className="flex flex-col gap-0.5 relative">
            {/* Timeline line */}
            <div
              className="absolute left-[7px] top-3 bottom-3 w-px"
              style={{ background: "var(--color-obsidian-border)" }}
            />

            {visibleItems.map((v, idx) => {
              const isExpanded = expandedId === v.id;
              // Compute diff stats against current content (or next version)
              const compareWith = idx === 0 ? note.content : historyItems[idx - 1].content;
              const { added, removed } = getDiffStats(v.content, compareWith);
              const timeAgo = getRelativeTime(v.savedAt);

              return (
                <div key={v.id} className="relative pl-5">
                  {/* Timeline dot */}
                  <div
                    className="absolute left-[4px] top-2 w-[7px] h-[7px] rounded-full border"
                    style={{
                      background: idx === 0 ? "var(--color-obsidian-accent)" : "var(--color-obsidian-bg)",
                      borderColor: idx === 0 ? "var(--color-obsidian-accent)" : "var(--color-obsidian-border)",
                    }}
                  />
                  <div
                    className="rounded-md px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      background: isExpanded ? "rgba(124,106,247,0.08)" : "var(--color-obsidian-bg)",
                      border: `1px solid ${isExpanded ? "var(--color-obsidian-accent)" : "var(--color-obsidian-border)"}`,
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium" style={{ color: "var(--color-obsidian-text)" }}>
                        {timeAgo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {added > 0 && (
                          <span className="text-xs flex items-center gap-0.5" style={{ color: "#a6e3a1" }}>
                            <Plus size={9} />
                            {added}
                          </span>
                        )}
                        {removed > 0 && (
                          <span className="text-xs flex items-center gap-0.5" style={{ color: "#f38ba8" }}>
                            <Minus size={9} />
                            {removed}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
                      {v.content.replace(/\s+/g, " ").slice(0, 60) || "(empty)"}
                    </p>

                    {/* Expanded: action buttons */}
                    {isExpanded && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRestoreVersion?.(note.id, v.id); }}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(124,106,247,0.2)", color: "var(--color-obsidian-accent-soft)" }}
                        >
                          <RotateCcw size={10} /> Restore
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDiffViewVersion(v); }}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(137,180,250,0.15)", color: "#89b4fa" }}
                        >
                          <Eye size={10} /> View Diff
                        </button>
                        <span className="text-xs ml-auto" style={{ color: "var(--color-obsidian-muted-text)" }}>
                          {new Date(v.savedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more / less */}
          {historyItems.length > 10 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs mt-2 px-2 py-1 rounded hover:opacity-80 w-full text-center"
              style={{ color: "var(--color-obsidian-accent-soft)", background: "rgba(124,106,247,0.08)" }}
            >
              {showAll ? `Show less` : `Show all ${historyItems.length} versions`}
            </button>
          )}
        </>
      )}

      {/* Full diff overlay */}
      {diffViewVersion && (
        <DiffViewer
          oldText={diffViewVersion.content}
          newText={note.content}
          onClose={() => setDiffViewVersion(null)}
        />
      )}
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
        {label}
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: "var(--color-obsidian-text)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({
  notes,
  onNoteClick,
  onNewDailyNote,
}: {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onNewDailyNote?: (date: Date) => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Find daily notes by date
  const dailyNotesByDate = useMemo(() => {
    const map: Record<string, Note> = {};
    notes.filter((n) => n.type === "daily").forEach((n) => {
      // Try to parse date from title or createdAt
      const dateStr = n.createdAt;
      if (dateStr) map[dateStr] = n;
    });
    return map;
  }, [notes]);

  const weeks: Array<Array<number | null>> = [];
  let week: Array<number | null> = new Array(startOffset).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().split("T")[0];
  };

  const handleDayClick = (day: number) => {
    const dateStr = getDateStr(day);
    const note = dailyNotesByDate[dateStr];
    if (note) {
      onNoteClick(note.id);
      setSelectedDay(null);
    } else {
      // Don't auto-create — just select the day to show a create prompt
      setSelectedDay(selectedDay === day ? null : day);
    }
  };

  // Reset selected day when month changes
  const handleMonthChange = (delta: number) => {
    setSelectedDay(null);
    setViewDate(new Date(year, month + delta, 1));
  };

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => handleMonthChange(-1)}
          className="p-1 rounded hover:bg-white/5"
        >
          <ChevronLeft size={14} style={{ color: "var(--color-obsidian-muted-text)" }} />
        </button>
        <span className="text-xs font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => handleMonthChange(1)}
          className="p-1 rounded hover:bg-white/5"
        >
          <ChevronRight size={14} style={{ color: "var(--color-obsidian-muted-text)" }} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="text-center text-xs py-1"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={di} className="w-full aspect-square" />;
              }
              const dateStr = getDateStr(day);
              const hasNote = !!dailyNotesByDate[dateStr];
              const isTodayDay = isToday(day);
              const isSelected = selectedDay === day && !hasNote;

              return (
                <button
                  key={di}
                  onClick={() => handleDayClick(day)}
                  className="w-full aspect-square rounded-md flex items-center justify-center text-xs transition-colors hover:bg-white/5 relative"
                  style={{
                    background: isTodayDay
                      ? "var(--color-obsidian-accent)"
                      : hasNote
                      ? "rgba(166,227,161,0.2)"
                      : isSelected
                      ? "rgba(59,142,245,0.15)"
                      : "transparent",
                    color: isTodayDay
                      ? "#fff"
                      : hasNote
                      ? "#a6e3a1"
                      : isSelected
                      ? "var(--color-obsidian-accent)"
                      : "var(--color-obsidian-text)",
                    fontWeight: isTodayDay || hasNote || isSelected ? 600 : 400,
                    outline: isSelected ? "1px solid var(--color-obsidian-accent)" : "none",
                    outlineOffset: "-1px",
                  }}
                >
                  {day}
                  {hasNote && !isTodayDay && (
                    <div
                      className="absolute bottom-0.5 w-1 h-1 rounded-full"
                      style={{ background: "#a6e3a1" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Create daily note prompt */}
      {selectedDay !== null && onNewDailyNote && (
        <div className="mt-2 p-2 rounded-lg" style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
            No note for {new Date(year, month, selectedDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <button
            onClick={() => {
              onNewDailyNote(new Date(year, month, selectedDay));
              setSelectedDay(null);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          >
            <Plus size={12} />
            Create daily note
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--color-obsidian-border)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-obsidian-accent)" }} />
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded" style={{ background: "rgba(166,227,161,0.4)" }} />
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Has note</span>
        </div>
      </div>
    </div>
  );
}

// ─── Local Graph Tab ──────────────────────────────────────────────────────────

function LocalGraphTab({
  note,
  notes,
  onNoteClick,
}: {
  note: Note;
  notes: Note[];
  onNoteClick: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build local graph data
  const graphData = useMemo(() => {
    const outlinks = extractWikilinks(note.content)
      .map((title) => getNoteByTitle(notes, title))
      .filter(Boolean) as Note[];
    const backlinks = getBacklinks(notes, note);

    const nodeMap = new Map<string, { note: Note; type: "center" | "outlink" | "backlink" }>();
    nodeMap.set(note.id, { note, type: "center" });
    outlinks.forEach((n) => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { note: n, type: "outlink" });
    });
    backlinks.forEach((n) => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { note: n, type: "backlink" });
    });

    const nodes = Array.from(nodeMap.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));

    const links: Array<{ source: string; target: string }> = [];
    outlinks.forEach((n) => links.push({ source: note.id, target: n.id }));
    backlinks.forEach((n) => links.push({ source: n.id, target: note.id }));

    return { nodes, links };
  }, [note, notes]);

  // Layout and render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position nodes in a circle around center
    const positions = new Map<string, { x: number; y: number }>();
    const radius = Math.min(width, height) * 0.35;

    graphData.nodes.forEach((node, i) => {
      if (node.type === "center") {
        positions.set(node.id, { x: centerX, y: centerY });
      } else {
        const angle = (i / (graphData.nodes.length - 1)) * Math.PI * 2 - Math.PI / 2;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }
    });

    // Draw
    ctx.clearRect(0, 0, width, height);

    // Links
    graphData.links.forEach((link) => {
      const from = positions.get(link.source);
      const to = positions.get(link.target);
      if (!from || !to) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = "rgba(124,106,247,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Nodes
    graphData.nodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const isHovered = hoveredNode === node.id;
      const isCenter = node.type === "center";
      const nodeRadius = isCenter ? 12 : 8;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);

      if (isCenter) {
        ctx.fillStyle = "var(--color-obsidian-accent)";
      } else if (node.type === "outlink") {
        ctx.fillStyle = isHovered ? "#89b4fa" : "rgba(137,180,250,0.7)";
      } else {
        ctx.fillStyle = isHovered ? "#a6e3a1" : "rgba(166,227,161,0.7)";
      }

      ctx.fill();

      if (isHovered || isCenter) {
        ctx.strokeStyle = isCenter ? "#fff" : ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      if (isHovered || isCenter) {
        ctx.font = `${isCenter ? "bold " : ""}10px sans-serif`;
        ctx.fillStyle = "var(--color-obsidian-text)";
        ctx.textAlign = "center";
        ctx.fillText(node.note.title.slice(0, 20), pos.x, pos.y + nodeRadius + 14);
      }
    });

    // Store positions for click handling
    (canvas as any).__positions = positions;
    (canvas as any).__nodes = graphData.nodes;
  }, [graphData, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = (canvas as any).__positions as Map<string, { x: number; y: number }>;
    const nodes = (canvas as any).__nodes as typeof graphData.nodes;

    if (!positions || !nodes) return;

    let found: string | null = null;
    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const dist = Math.hypot(x - pos.x, y - pos.y);
      if (dist < 15) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = (canvas as any).__positions as Map<string, { x: number; y: number }>;
    const nodes = (canvas as any).__nodes as typeof graphData.nodes;

    if (!positions || !nodes) return;

    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const dist = Math.hypot(x - pos.x, y - pos.y);
      if (dist < 15) {
        onNoteClick(node.id);
        break;
      }
    }
  };

  if (graphData.nodes.length <= 1) {
    return (
      <div className="px-4 py-6 text-center">
        <Share2
          size={24}
          className="mx-auto mb-2 opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        />
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No connections found for this note.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Add wikilinks to create connections.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-48 relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleClick}
      />
      {/* Legend */}
      <div
        className="absolute bottom-2 left-2 flex flex-col gap-1 p-2 rounded-lg"
        style={{
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-obsidian-accent)" }} />
          <span className="text-xs" style={{ color: "var(--color-obsidian-text)", fontSize: "0.65em" }}>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#89b4fa" }} />
          <span className="text-xs" style={{ color: "var(--color-obsidian-text)", fontSize: "0.65em" }}>Links to</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#a6e3a1" }} />
          <span className="text-xs" style={{ color: "var(--color-obsidian-text)", fontSize: "0.65em" }}>Links from</span>
        </div>
      </div>
    </div>
  );
}

// ─── Heatmap Calendar Tab ─────────────────────────────────────────────────────

function HeatmapTab({ notes }: { notes: Note[] }) {
  const weeks = 52;
  const days = 7;

  // Build activity map from note creation/update dates (last 365 days)
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    notes.forEach((n) => {
      if (n.trashed) return;
      // Count createdAt
      const cd = n.createdAt?.split("T")[0];
      if (cd) map[cd] = (map[cd] || 0) + 1;
      // Count updatedAt if different
      const ud = n.updatedAt?.split("T")[0];
      if (ud && ud !== cd) map[ud] = (map[ud] || 0) + 1;
      // Count version history entries
      (n.versionHistory ?? []).forEach((v) => {
        const vd = v.savedAt?.split("T")[0];
        if (vd) map[vd] = (map[vd] || 0) + 1;
      });
    });
    return map;
  }, [notes]);

  const maxCount = Math.max(1, ...Object.values(activityMap));

  // Generate grid: 52 weeks × 7 days, ending today
  const grid = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun
    const result: Array<{ date: string; count: number }[]> = [];

    // Start from 52 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * days) - todayDay);

    for (let w = 0; w <= weeks; w++) {
      const week: Array<{ date: string; count: number }> = [];
      for (let d = 0; d < days; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        const dateStr = cellDate.toISOString().split("T")[0];
        week.push({ date: dateStr, count: activityMap[dateStr] || 0 });
      }
      result.push(week);
    }
    return result;
  }, [activityMap]);

  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "rgba(166,227,161,0.2)";
    if (intensity < 0.5) return "rgba(166,227,161,0.4)";
    if (intensity < 0.75) return "rgba(166,227,161,0.6)";
    return "rgba(166,227,161,0.9)";
  };

  const totalEdits = Object.values(activityMap).reduce((s, v) => s + v, 0);
  const activeDays = Object.keys(activityMap).length;

  return (
    <div className="p-3">
      <p className="text-xs font-semibold mb-3 flex items-center gap-1" style={{ color: "var(--color-obsidian-text)" }}>
        <Flame size={12} /> Activity Heatmap
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
          <div className="text-sm font-bold" style={{ color: "var(--color-obsidian-accent-soft)" }}>{totalEdits}</div>
          <div className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Total edits</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
          <div className="text-sm font-bold" style={{ color: "#a6e3a1" }}>{activeDays}</div>
          <div className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Active days</div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-px" style={{ minWidth: "fit-content" }}>
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-px">
              {week.map((cell, di) => (
                <div
                  key={di}
                  className="rounded-sm"
                  style={{
                    width: 8,
                    height: 8,
                    background: getColor(cell.count),
                  }}
                  title={`${cell.date}: ${cell.count} edit${cell.count !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} className="rounded-sm" style={{ width: 8, height: 8, background: getColor(v * maxCount) }} />
        ))}
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>More</span>
      </div>

      {/* Month labels */}
      <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }}>
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Showing the last 12 months of vault activity based on note creation, edits, and version history.
        </p>
      </div>
    </div>
  );
}

// ─── Spaced Repetition / Flashcards Tab ───────────────────────────────────────

interface Flashcard {
  noteId: string;
  noteTitle: string;
  question: string;
  answer: string;
}

function FlashcardsTab({ notes }: { notes: Note[] }) {
  const [flipped, setFlipped] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [difficulty, setDifficulty] = useState<Record<string, "easy" | "medium" | "hard">>({});

  // Parse flashcards from notes: lines with "Q:" / "A:" pairs, or "?" separator
  const cards = useMemo<Flashcard[]>(() => {
    const result: Flashcard[] = [];
    for (const note of notes) {
      if (note.trashed) continue;
      const lines = note.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Format 1: Q: ... / A: ...
        if (/^Q:\s/i.test(line) && i + 1 < lines.length && /^A:\s/i.test(lines[i + 1].trim())) {
          result.push({
            noteId: note.id,
            noteTitle: note.title,
            question: line.replace(/^Q:\s*/i, ""),
            answer: lines[i + 1].trim().replace(/^A:\s*/i, ""),
          });
          i++; // skip answer line
        }
        // Format 2: Front ? Back (single-line separator)
        else if (line.includes(" ? ") && !line.startsWith("#") && !line.startsWith("-")) {
          const [q, ...aParts] = line.split(" ? ");
          if (q.trim() && aParts.join(" ? ").trim()) {
            result.push({
              noteId: note.id,
              noteTitle: note.title,
              question: q.trim(),
              answer: aParts.join(" ? ").trim(),
            });
          }
        }
      }
    }
    return result;
  }, [notes]);

  if (cards.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <BookOpen size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--color-obsidian-muted-text)" }} />
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>No flashcards found.</p>
        <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Add cards to your notes using:
        </p>
        <div className="mt-2 text-left rounded-lg p-2" style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}>
          <code className="text-xs block" style={{ color: "var(--color-obsidian-code-text)" }}>
            Q: What is Obsidian?{"\n"}A: A knowledge base app
          </code>
          <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>or</p>
          <code className="text-xs block" style={{ color: "var(--color-obsidian-code-text)" }}>
            Capital of France ? Paris
          </code>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx % cards.length];

  const handleNext = (diff: "easy" | "medium" | "hard") => {
    const key = `${card.noteId}-${currentIdx}`;
    setDifficulty((prev) => ({ ...prev, [key]: diff }));
    setReviewedCount((c) => c + 1);
    setFlipped(false);
    setCurrentIdx((i) => (i + 1) % cards.length);
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-obsidian-text)" }}>
          <BookOpen size={12} /> Flashcards
        </p>
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {currentIdx % cards.length + 1}/{cards.length} · {reviewedCount} reviewed
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-lg p-4 cursor-pointer transition-all min-h-[120px] flex flex-col items-center justify-center text-center"
        style={{
          background: flipped ? "rgba(166,227,161,0.08)" : "var(--color-obsidian-bg)",
          border: `1px solid ${flipped ? "rgba(166,227,161,0.3)" : "var(--color-obsidian-border)"}`,
        }}
        onClick={() => setFlipped(!flipped)}
      >
        <p className="text-xs mb-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {flipped ? "Answer" : "Question"} · {card.noteTitle}
        </p>
        <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
          {flipped ? card.answer : card.question}
        </p>
        {!flipped && (
          <p className="text-xs mt-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Click to reveal answer
          </p>
        )}
      </div>

      {/* Difficulty buttons (show after flip) */}
      {flipped && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleNext("hard")}
            className="flex-1 text-xs py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "rgba(243,139,168,0.2)", color: "#f38ba8" }}
          >
            Hard
          </button>
          <button
            onClick={() => handleNext("medium")}
            className="flex-1 text-xs py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "rgba(249,226,175,0.2)", color: "#f9e2af" }}
          >
            Medium
          </button>
          <button
            onClick={() => handleNext("easy")}
            className="flex-1 text-xs py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "rgba(166,227,161,0.2)", color: "#a6e3a1" }}
          >
            Easy
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 rounded-full overflow-hidden h-1" style={{ background: "var(--color-obsidian-border)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(reviewedCount / Math.max(cards.length, 1)) * 100}%`,
            background: "var(--color-obsidian-accent)",
            maxWidth: "100%",
          }}
        />
      </div>
    </div>
  );
}

// ─── Mind Map Tab ─────────────────────────────────────────────────────────────

interface MindMapNode {
  id: string;
  text: string;
  level: number;
  children: MindMapNode[];
}

function MindMapTab({ note }: { note: Note }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse headings into a tree structure
  const tree = useMemo<MindMapNode>(() => {
    const root: MindMapNode = { id: "root", text: note.title, level: 0, children: [] };
    const stack: MindMapNode[] = [root];

    note.content.split("\n").forEach((line, i) => {
      const m = line.match(/^(#{1,6})\s+(.+)$/);
      if (m) {
        const level = m[1].length;
        const node: MindMapNode = { id: `h-${i}`, text: m[2], level, children: [] };

        // Find appropriate parent
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      }
    });

    return root;
  }, [note.content, note.title]);

  // Flatten tree for positioning
  const flatNodes = useMemo(() => {
    const result: Array<{ node: MindMapNode; depth: number; index: number; parentId: string | null }> = [];
    let idx = 0;

    function walk(n: MindMapNode, depth: number, parentId: string | null) {
      result.push({ node: n, depth, index: idx++, parentId });
      n.children.forEach((c) => walk(c, depth + 1, n.id));
    }
    walk(tree, 0, null);
    return result;
  }, [tree]);

  // Render mind map
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = Math.max(rect.height, flatNodes.length * 28 + 40) * dpr;
    canvas.style.height = `${Math.max(rect.height, flatNodes.length * 28 + 40)}px`;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = Math.max(rect.height, flatNodes.length * 28 + 40);

    ctx.clearRect(0, 0, w, h);

    // Position nodes
    const positions = new Map<string, { x: number; y: number; w: number }>();
    const nodeH = 22;
    const gapY = 6;
    const indentX = 24;
    const startX = 16;
    const startY = 16;

    flatNodes.forEach((fn, i) => {
      const x = startX + fn.depth * indentX;
      const y = startY + i * (nodeH + gapY);
      const textW = Math.min(ctx.measureText(fn.node.text).width + 16, w - x - 8);
      positions.set(fn.node.id, { x, y, w: textW });
    });

    // Draw connections
    flatNodes.forEach((fn) => {
      if (!fn.parentId) return;
      const parentPos = positions.get(fn.parentId);
      const childPos = positions.get(fn.node.id);
      if (!parentPos || !childPos) return;

      ctx.beginPath();
      ctx.moveTo(parentPos.x + 6, parentPos.y + nodeH / 2);
      ctx.bezierCurveTo(
        parentPos.x + 6, childPos.y + nodeH / 2,
        childPos.x - 4, childPos.y + nodeH / 2,
        childPos.x, childPos.y + nodeH / 2
      );
      ctx.strokeStyle = "rgba(124,106,247,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw nodes
    const colors = ["var(--color-obsidian-accent)", "#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cba6f7", "#fab387"];

    flatNodes.forEach((fn) => {
      const pos = positions.get(fn.node.id);
      if (!pos) return;

      const isRoot = fn.depth === 0;
      const color = colors[fn.depth % colors.length];
      const radius = 10;

      // Node background
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, pos.w, nodeH, radius);
      ctx.fillStyle = isRoot ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isRoot ? 2 : 1;
      ctx.stroke();

      // Node text
      ctx.fillStyle = isRoot ? "#fff" : "rgba(255,255,255,0.8)";
      ctx.font = `${isRoot ? "bold " : ""}${isRoot ? 11 : 10}px sans-serif`;
      ctx.textBaseline = "middle";
      const maxTextW = pos.w - 12;
      let text = fn.node.text;
      while (ctx.measureText(text).width > maxTextW && text.length > 3) {
        text = text.slice(0, -1);
      }
      if (text !== fn.node.text) text += "…";
      ctx.fillText(text, pos.x + 6, pos.y + nodeH / 2);
    });
  }, [flatNodes]);

  if (flatNodes.length <= 1) {
    return (
      <div className="px-4 py-6 text-center">
        <Brain size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--color-obsidian-muted-text)" }} />
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No headings found to build a mind map.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Add headings (# ## ###) to see the structure.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <p className="text-xs font-semibold mb-2 px-1 flex items-center gap-1" style={{ color: "var(--color-obsidian-text)" }}>
        <Brain size={12} /> Mind Map
      </p>
      <div ref={containerRef} className="overflow-auto" style={{ maxHeight: 400 }}>
        <canvas ref={canvasRef} className="w-full" />
      </div>
    </div>
  );
}

// ─── Main RightPanel ──────────────────────────────────────────────────────────

export default function RightPanel({
  state,
  onStateChange,
  onNoteClick,
  onRestoreVersion,
  onNewDailyNote,
}: RightPanelProps) {
  const { notes, activeNoteId, rightPanelTab, installedPluginIds } = state;
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const tabs = useMemo(() => getTabs(installedPluginIds ?? []), [installedPluginIds]);

  // Cast to TabId, defaulting to backlinks
  const currentTab: TabId = (tabs.some((t) => t.id === rightPanelTab) ? rightPanelTab : "backlinks") as TabId;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--color-obsidian-surface)",
        borderLeft: "1px solid var(--color-obsidian-border)",
      }}
    >
      {/* Tabs */}
      <div
        className="flex items-center shrink-0 overflow-x-auto scrollbar-thin"
        style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
      >
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onStateChange({ rightPanelTab: id as AppState["rightPanelTab"] })}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors min-w-0"
            style={{
              color:
                currentTab === id
                  ? "var(--color-obsidian-accent-soft)"
                  : "var(--color-obsidian-muted-text)",
              borderBottom:
                currentTab === id
                  ? "2px solid var(--color-obsidian-accent)"
                  : "2px solid transparent",
            }}
            title={label}
          >
            <Icon size={12} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!activeNote ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Open a note to see its details here.
            </p>
          </div>
        ) : currentTab === "backlinks" ? (
          <BacklinksTab note={activeNote} notes={notes} onNoteClick={onNoteClick} />
        ) : currentTab === "outline" ? (
          <OutlineTab note={activeNote} />
        ) : currentTab === "properties" ? (
          <PropertiesTab
            note={activeNote}
            notes={notes}
            onNoteClick={onNoteClick}
            onRestoreVersion={onRestoreVersion}
          />
        ) : currentTab === "calendar" ? (
          <CalendarTab notes={notes} onNoteClick={onNoteClick} onNewDailyNote={onNewDailyNote} />
        ) : currentTab === "localgraph" ? (
          <LocalGraphTab note={activeNote} notes={notes} onNoteClick={onNoteClick} />
        ) : currentTab === "heatmap" ? (
          <HeatmapTab notes={notes} />
        ) : currentTab === "flashcards" ? (
          <FlashcardsTab notes={notes} />
        ) : currentTab === "mindmap" ? (
          <MindMapTab note={activeNote} />
        ) : null}
      </div>
    </div>
  );
}
