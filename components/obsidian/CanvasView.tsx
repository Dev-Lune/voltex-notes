"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Square, Type, ZoomIn, ZoomOut, Maximize2, GripVertical, X } from "lucide-react";
import { Note } from "./data";

// ─── Types ────────────────────────────────────────────────────────────────────

type CanvasAnchorSide = "top" | "right" | "bottom" | "left";

interface CanvasCard {
  id: string;
  type: "note" | "text" | "media";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  noteId?: string;
  color?: string;
}

interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: CanvasAnchorSide;
  toSide?: CanvasAnchorSide;
  color?: string;
}

interface CanvasGroup {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

interface CanvasState {
  cards: CanvasCard[];
  connections: CanvasConnection[];
  groups: CanvasGroup[];
  zoom: number;
  panX: number;
  panY: number;
}

interface CanvasViewProps {
  note: Note;
  allNotes: Note[];
  onChange: (content: string) => void;
  onNoteClick?: (id: string) => void;
}

interface PendingConnection {
  fromId: string;
  fromSide: CanvasAnchorSide;
  startX: number;
  startY: number;
}

const ANCHOR_SIDES: CanvasAnchorSide[] = ["top", "right", "bottom", "left"];

const COLORS = [
  "#cdd6f4", "#89b4fa", "#a6e3a1", "#f9e2af", "#fab387",
  "#f38ba8", "#cba6f7", "#74c7ec", "#94e2d5",
];

const EMPTY_CANVAS: CanvasState = {
  cards: [],
  connections: [],
  groups: [],
  zoom: 1,
  panX: 0,
  panY: 0,
};

function parseCanvasContent(content: string): CanvasState {
  try {
    const parsed = JSON.parse(content);
    return {
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      zoom: typeof parsed.zoom === "number" ? parsed.zoom : 1,
      panX: typeof parsed.panX === "number" ? parsed.panX : 0,
      panY: typeof parsed.panY === "number" ? parsed.panY : 0,
    };
  } catch {
    return EMPTY_CANVAS;
  }
}

function serializeCanvas(canvas: CanvasState): string {
  return JSON.stringify({
    cards: canvas.cards,
    connections: canvas.connections,
    groups: canvas.groups,
    zoom: canvas.zoom,
    panX: canvas.panX,
    panY: canvas.panY,
  });
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getAnchorPoint(card: CanvasCard, side: CanvasAnchorSide) {
  switch (side) {
    case "top":
      return { x: card.x + card.width / 2, y: card.y };
    case "bottom":
      return { x: card.x + card.width / 2, y: card.y + card.height };
    case "left":
      return { x: card.x, y: card.y + card.height / 2 };
    case "right":
      return { x: card.x + card.width, y: card.y + card.height / 2 };
  }
}

function getCardAnchorScreenPoint(
  card: CanvasCard,
  side: CanvasAnchorSide,
  zoom: number,
  panX: number,
  panY: number
) {
  return getAnchorPoint(
    {
      ...card,
      x: card.x * zoom + panX,
      y: card.y * zoom + panY,
      width: card.width * zoom,
      height: card.height * zoom,
    },
    side
  );
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string = "rgba(124,106,247,0.6)",
  isSelected: boolean = false
) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);

  // Bezier curve
  const midX = (from.x + to.x) / 2;
  ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);

  ctx.strokeStyle = isSelected ? "#7c6af7" : color;
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.stroke();

  // Arrow head
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowSize = 8;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - arrowSize * Math.cos(angle - Math.PI / 6),
    to.y - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - arrowSize * Math.cos(angle + Math.PI / 6),
    to.y - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = isSelected ? "#7c6af7" : color;
  ctx.fill();
}

// ─── Canvas Card Component ────────────────────────────────────────────────────

function CanvasCardComponent({
  card,
  isSelected,
  zoom,
  onSelect,
  onDragStart,
  onResize,
  onContentChange,
  onDelete,
  onNoteClick,
  note,
  showAnchors,
  isConnectionSource,
  onAnchorStart,
  onAnchorEnd,
}: {
  card: CanvasCard;
  isSelected: boolean;
  zoom: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResize: (width: number, height: number) => void;
  onContentChange: (content: string) => void;
  onDelete: () => void;
  onNoteClick?: (id: string) => void;
  note?: Note;
  showAnchors: boolean;
  isConnectionSource: boolean;
  onAnchorStart: (side: CanvasAnchorSide, e: React.MouseEvent) => void;
  onAnchorEnd: (side: CanvasAnchorSide, e: React.MouseEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => {
    if (card.type === "note" && card.noteId && onNoteClick) {
      onNoteClick(card.noteId);
    } else {
      setEditing(true);
    }
  };

  const content = card.noteId && note ? note.content.slice(0, 200) : card.content;
  const title = card.noteId && note ? note.title : undefined;

  return (
    <div
      className="absolute rounded-xl shadow-xl overflow-visible transition-shadow"
      style={{
        left: card.x * zoom,
        top: card.y * zoom,
        width: card.width * zoom,
        height: card.height * zoom,
        background: "var(--color-obsidian-surface)",
        border: isSelected
          ? "2px solid var(--color-obsidian-accent)"
          : "1px solid var(--color-obsidian-border)",
        boxShadow: isSelected ? "0 0 0 3px color-mix(in srgb, var(--color-obsidian-accent) 22%, transparent)" : undefined,
        zIndex: isSelected || isConnectionSource ? 12 : 1,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-move"
        onMouseDown={onDragStart}
        style={{
          borderBottom: "1px solid var(--color-obsidian-border)",
          background: card.color ? `${card.color}15` : "var(--color-obsidian-bg)",
        }}
      >
        <GripVertical size={12} style={{ color: "var(--color-obsidian-muted-text)" }} />
        {card.type === "note" ? (
          <FileText size={12} style={{ color: card.color || "var(--color-obsidian-link)" }} />
        ) : card.type === "text" ? (
          <Type size={12} style={{ color: card.color || "var(--color-obsidian-accent-soft)" }} />
        ) : (
          <Square size={12} style={{ color: card.color || "var(--color-obsidian-muted-text)" }} />
        )}
        <span
          className="flex-1 text-xs font-medium truncate"
          style={{ color: "var(--color-obsidian-text)" }}
        >
          {title || (card.type === "note" ? "Note Card" : card.type === "text" ? "Text" : "Media")}
        </span>
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-white/10"
          >
            <X size={10} style={{ color: "var(--color-obsidian-muted-text)" }} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 overflow-hidden h-full">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={card.content}
            onChange={(e) => onContentChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full h-full bg-transparent outline-none resize-none text-xs"
            style={{
              color: "var(--color-obsidian-text)",
              fontFamily: "var(--font-sans)",
            }}
          />
        ) : (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            {content}
            {card.noteId && note && note.content.length > 200 && "…"}
          </p>
        )}
      </div>

      {/* Resize handle */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{ background: "var(--color-obsidian-accent)", borderRadius: "4px 0 8px 0" }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = card.width;
            const startH = card.height;

            const handleMove = (moveE: MouseEvent) => {
              const dx = (moveE.clientX - startX) / zoom;
              const dy = (moveE.clientY - startY) / zoom;
              onResize(Math.max(120, startW + dx), Math.max(80, startH + dy));
            };

            const handleUp = () => {
              window.removeEventListener("mousemove", handleMove);
              window.removeEventListener("mouseup", handleUp);
            };

            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
          }}
        />
      )}

      {/* Connection anchors */}
      {showAnchors && (
        <>
          {ANCHOR_SIDES.map((side) => {
            const pos = getAnchorPoint(
              { ...card, x: 0, y: 0, width: card.width * zoom, height: card.height * zoom },
              side
            );
            return (
              <button
                key={side}
                type="button"
                className="absolute w-4 h-4 rounded-full cursor-crosshair transition-transform hover:scale-110"
                style={{
                  left: pos.x - 8,
                  top: pos.y - 8,
                  background: isConnectionSource ? "var(--color-obsidian-accent)" : "var(--color-obsidian-surface)",
                  border: `2px solid ${card.color || "var(--color-obsidian-accent)"}`,
                  boxShadow: "0 0 0 2px var(--color-obsidian-bg)",
                }}
                onMouseDown={(e) => onAnchorStart(side, e)}
                onMouseUp={(e) => onAnchorEnd(side, e)}
                onClick={(e) => e.stopPropagation()}
                title={`Connect from ${side}`}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Canvas Group Component ───────────────────────────────────────────────────

function CanvasGroupComponent({
  group,
  zoom,
  isSelected,
  onSelect,
  onDragStart,
  onLabelChange,
}: {
  group: CanvasGroup;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onLabelChange: (label: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <div
      className="absolute rounded-2xl transition-all"
      style={{
        left: group.x * zoom,
        top: group.y * zoom,
        width: group.width * zoom,
        height: group.height * zoom,
        background: group.color,
        border: isSelected ? "2px dashed var(--color-obsidian-accent)" : "1px dashed var(--color-obsidian-border)",
        zIndex: 0,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={onDragStart}
    >
      {/* Label */}
      <div
        className="absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          color: "var(--color-obsidian-text)",
        }}
        onDoubleClick={() => setEditingLabel(true)}
      >
        {editingLabel ? (
          <input
            autoFocus
            value={group.label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => setEditingLabel(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingLabel(false)}
            className="bg-transparent outline-none w-24"
            style={{ color: "var(--color-obsidian-text)" }}
          />
        ) : (
          group.label
        )}
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddCard,
  onAddGroup,
  selectedColor,
  onColorChange,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddCard: (type: "note" | "text") => void;
  onAddGroup: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const normalizedSelectedColor = selectedColor.startsWith("#") && selectedColor.length >= 7
    ? selectedColor.slice(0, 7)
    : selectedColor;

  useEffect(() => {
    if (!showColors) return;

    const handlePointerDown = () => setShowColors(false);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showColors]);

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-xl z-20"
      style={{
        background: "var(--color-obsidian-surface)",
        border: "1px solid var(--color-obsidian-border)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Add buttons */}
      <button
        onClick={(e) => { e.stopPropagation(); onAddCard("note"); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
        style={{ color: "var(--color-obsidian-text)" }}
        title="Add note card"
      >
        <FileText size={13} />
        <span className="hidden sm:inline">Note</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAddCard("text"); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
        style={{ color: "var(--color-obsidian-text)" }}
        title="Add text card"
      >
        <Type size={13} />
        <span className="hidden sm:inline">Text</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAddGroup(); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
        style={{ color: "var(--color-obsidian-text)" }}
        title="Add group"
      >
        <Square size={13} />
        <span className="hidden sm:inline">Group</span>
      </button>

      <div className="w-px h-5 mx-1" style={{ background: "var(--color-obsidian-border)" }} />

      {/* Color picker */}
      <div className="relative" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColors((value) => !value);
          }}
          className="p-1.5 rounded-lg transition-colors"
          title="Change selected item color"
        >
          <div
            className="w-4 h-4 rounded"
            style={{
              background: normalizedSelectedColor,
              border: "1px solid color-mix(in srgb, var(--color-obsidian-border) 80%, white 20%)",
            }}
          />
        </button>
        {showColors && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg shadow-xl grid grid-cols-5 gap-1 z-30"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange(c);
                  setShowColors(false);
                }}
                className="w-5 h-5 rounded transition-transform hover:scale-110"
                style={{
                  background: c,
                  border: normalizedSelectedColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 mx-1" style={{ background: "var(--color-obsidian-border)" }} />

      {/* Zoom controls */}
      <button
        onClick={(e) => { e.stopPropagation(); onZoomOut(); }}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Zoom out"
      >
        <ZoomOut size={14} />
      </button>
      <span
        className="text-xs w-10 text-center"
        style={{ color: "var(--color-obsidian-text)" }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onZoomIn(); }}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Zoom in"
      >
        <ZoomIn size={14} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onFitView(); }}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Fit view"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}

// ─── Main Canvas View ─────────────────────────────────────────────────────────

export default function CanvasView({ note, allNotes, onChange, onNoteClick }: CanvasViewProps) {
  const [canvas, setCanvas] = useState<CanvasState>(() => parseCanvasContent(note.content));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"card" | "group" | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; objX: number; objY: number } | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [connecting, setConnecting] = useState<PendingConnection | null>(null);
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const connectionsCanvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef(note.id);

  const selectedCard = selectedType === "card"
    ? canvas.cards.find((card) => card.id === selectedId)
    : undefined;
  const selectedGroup = selectedType === "group"
    ? canvas.groups.find((group) => group.id === selectedId)
    : undefined;

  // Reload canvas data when switching to a different canvas note
  useEffect(() => {
    if (note.id !== noteIdRef.current) {
      noteIdRef.current = note.id;
      setCanvas(parseCanvasContent(note.content));
      setSelectedId(null);
      setSelectedType(null);
      setConnecting(null);
    }
  }, [note.id, note.content]);

  // Debounced auto-save: persist canvas state back to the note
  const saveCanvas = useCallback((state: CanvasState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onChange(serializeCanvas(state));
    }, 400);
  }, [onChange]);

  // Wrapper that updates local state and triggers save
  const updateCanvas = useCallback((updater: (prev: CanvasState) => CanvasState) => {
    setCanvas((prev) => {
      const next = updater(prev);
      saveCanvas(next);
      return next;
    });
  }, [saveCanvas]);

  // Draw saved + in-progress connections
  useEffect(() => {
    const cnv = connectionsCanvasRef.current;
    const container = containerRef.current;
    if (!cnv || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cnv.width = rect.width * dpr;
    cnv.height = rect.height * dpr;
    cnv.style.width = `${rect.width}px`;
    cnv.style.height = `${rect.height}px`;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    canvas.connections.forEach((conn) => {
      const fromCard = canvas.cards.find((card) => card.id === conn.fromId);
      const toCard = canvas.cards.find((card) => card.id === conn.toId);
      if (!fromCard || !toCard) return;

      const fromPos = getCardAnchorScreenPoint(
        fromCard,
        conn.fromSide || "right",
        canvas.zoom,
        canvas.panX,
        canvas.panY
      );
      const toPos = getCardAnchorScreenPoint(
        toCard,
        conn.toSide || "left",
        canvas.zoom,
        canvas.panX,
        canvas.panY
      );

      drawConnection(ctx, fromPos, toPos, conn.color);
    });

    if (connecting) {
      drawConnection(
        ctx,
        { x: connecting.startX, y: connecting.startY },
        pointerPosition,
        activeColor,
        true
      );
    }
  }, [canvas, connecting, pointerPosition, activeColor]);

  // Pan handling
  const handlePan = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1 || dragging) return;

    const handleMove = (moveE: MouseEvent) => {
      setCanvas((prev) => ({
        ...prev,
        panX: prev.panX + moveE.movementX,
        panY: prev.panY + moveE.movementY,
      }));
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      // Save pan position on release
      setCanvas((prev) => { saveCanvas(prev); return prev; });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [dragging, saveCanvas]);

  // Drag card/group
  const startDrag = (id: string, type: "card" | "group", e: React.MouseEvent) => {
    e.stopPropagation();
    const obj = type === "card"
      ? canvas.cards.find((c) => c.id === id)
      : canvas.groups.find((g) => g.id === id);
    if (!obj) return;

    setConnecting(null);
    setDragging({
      id,
      startX: e.clientX,
      startY: e.clientY,
      objX: obj.x,
      objY: obj.y,
    });
    setSelectedId(id);
    setSelectedType(type);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!connecting || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointerPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [connecting]);

  const beginConnection = (cardId: string, side: CanvasAnchorSide, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = canvas.cards.find((item) => item.id === cardId);
    if (!card) return;

    const start = getCardAnchorScreenPoint(card, side, canvas.zoom, canvas.panX, canvas.panY);
    setConnecting({
      fromId: cardId,
      fromSide: side,
      startX: start.x,
      startY: start.y,
    });
    setPointerPosition(start);
    setSelectedId(cardId);
    setSelectedType("card");
  };

  const completeConnection = (toId: string, toSide: CanvasAnchorSide, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connecting) return;

    updateCanvas((prev) => {
      if (connecting.fromId === toId) return prev;

      const exists = prev.connections.some((conn) =>
        conn.fromId === connecting.fromId
        && conn.toId === toId
        && conn.fromSide === connecting.fromSide
        && conn.toSide === toSide
      );
      if (exists) return prev;

      return {
        ...prev,
        connections: [
          ...prev.connections,
          {
            id: `conn-${Date.now()}`,
            fromId: connecting.fromId,
            toId,
            fromSide: connecting.fromSide,
            toSide,
            color: activeColor,
          },
        ],
      };
    });

    setConnecting(null);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / canvas.zoom;
      const dy = (e.clientY - dragging.startY) / canvas.zoom;

      if (selectedType === "card") {
        setCanvas((prev) => ({
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === dragging.id ? { ...c, x: dragging.objX + dx, y: dragging.objY + dy } : c
          ),
        }));
      } else {
        setCanvas((prev) => ({
          ...prev,
          groups: prev.groups.map((g) =>
            g.id === dragging.id ? { ...g, x: dragging.objX + dx, y: dragging.objY + dy } : g
          ),
        }));
      }
    };

    const handleUp = () => {
      setDragging(null);
      // Save position on drag end
      setCanvas((prev) => { saveCanvas(prev); return prev; });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, canvas.zoom, selectedType, saveCanvas]);

  useEffect(() => {
    if (!connecting) return;

    const handleMouseUp = () => setConnecting(null);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [connecting]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    updateCanvas((prev) => ({
      ...prev,
      zoom: Math.min(2, Math.max(0.25, prev.zoom * delta)),
    }));
  }, [updateCanvas]);

  // Add card
  const addCard = (type: "note" | "text") => {
    const id = `card-${Date.now()}`;
    const newCard: CanvasCard = {
      id,
      type,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      width: type === "text" ? 180 : 220,
      height: type === "text" ? 80 : 140,
      content: type === "text" ? "New text" : "New note card",
      color: activeColor,
    };
    updateCanvas((prev) => ({ ...prev, cards: [...prev.cards, newCard] }));
    setSelectedId(id);
    setSelectedType("card");
  };

  // Add group
  const addGroup = () => {
    const id = `group-${Date.now()}`;
    const newGroup: CanvasGroup = {
      id,
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      width: 280,
      height: 200,
      label: "New Group",
      color: `${activeColor}20`,
    };
    updateCanvas((prev) => ({ ...prev, groups: [...prev.groups, newGroup] }));
    setSelectedId(id);
    setSelectedType("group");
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);

    if (!selectedId || !selectedType) return;

    updateCanvas((prev) => {
      if (selectedType === "card") {
        return {
          ...prev,
          cards: prev.cards.map((card) => (
            card.id === selectedId ? { ...card, color } : card
          )),
        };
      }

      return {
        ...prev,
        groups: prev.groups.map((group) => (
          group.id === selectedId ? { ...group, color: `${color}20` } : group
        )),
      };
    });
  };

  // Delete selected
  const deleteSelected = () => {
    if (!selectedId) return;
    if (selectedType === "card") {
      updateCanvas((prev) => ({
        ...prev,
        cards: prev.cards.filter((c) => c.id !== selectedId),
        connections: prev.connections.filter((conn) => conn.fromId !== selectedId && conn.toId !== selectedId),
      }));
    } else {
      updateCanvas((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== selectedId),
      }));
    }
    setSelectedId(null);
    setSelectedType(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !document.activeElement?.matches("input, textarea")) {
          deleteSelected();
        }
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedType(null);
        setConnecting(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "var(--color-obsidian-bg)" }}
      onMouseDown={handlePan}
      onMouseMove={handleCanvasMouseMove}
      onWheel={handleWheel}
      onClick={() => {
        setSelectedId(null);
        setSelectedType(null);
        setConnecting(null);
      }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--color-obsidian-accent) 12%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--color-obsidian-accent) 12%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * canvas.zoom}px ${20 * canvas.zoom}px`,
          backgroundPosition: `${canvas.panX}px ${canvas.panY}px`,
        }}
      />

      {/* Connections canvas */}
      <canvas
        ref={connectionsCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Transform container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${canvas.panX}px, ${canvas.panY}px)`,
        }}
      >
        {/* Groups */}
        {canvas.groups.map((group) => (
          <CanvasGroupComponent
            key={group.id}
            group={group}
            zoom={canvas.zoom}
            isSelected={selectedId === group.id}
            onSelect={() => { setSelectedId(group.id); setSelectedType("group"); }}
            onDragStart={(e) => startDrag(group.id, "group", e)}
            onLabelChange={(label) =>
              updateCanvas((prev) => ({
                ...prev,
                groups: prev.groups.map((g) => (g.id === group.id ? { ...g, label } : g)),
              }))
            }
          />
        ))}

        {/* Cards */}
        {canvas.cards.map((card) => (
          <CanvasCardComponent
            key={card.id}
            card={card}
            isSelected={selectedId === card.id}
            zoom={canvas.zoom}
            onSelect={() => { setSelectedId(card.id); setSelectedType("card"); }}
            onDragStart={(e) => startDrag(card.id, "card", e)}
            onResize={(width, height) =>
              updateCanvas((prev) => ({
                ...prev,
                cards: prev.cards.map((c) => (c.id === card.id ? { ...c, width, height } : c)),
              }))
            }
            onContentChange={(content) =>
              updateCanvas((prev) => ({
                ...prev,
                cards: prev.cards.map((c) => (c.id === card.id ? { ...c, content } : c)),
              }))
            }
            onDelete={deleteSelected}
            onNoteClick={onNoteClick}
            note={card.noteId ? allNotes.find((n) => n.id === card.noteId) : undefined}
            showAnchors={selectedId === card.id || Boolean(connecting)}
            isConnectionSource={connecting?.fromId === card.id}
            onAnchorStart={(side, e) => beginConnection(card.id, side, e)}
            onAnchorEnd={(side, e) => completeConnection(card.id, side, e)}
          />
        ))}
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        zoom={canvas.zoom}
        onZoomIn={() => updateCanvas((prev) => ({ ...prev, zoom: Math.min(2, prev.zoom * 1.2) }))}
        onZoomOut={() => updateCanvas((prev) => ({ ...prev, zoom: Math.max(0.25, prev.zoom / 1.2) }))}
        onFitView={() => updateCanvas((prev) => ({ ...prev, zoom: 1, panX: 0, panY: 0 }))}
        onAddCard={addCard}
        onAddGroup={addGroup}
        selectedColor={selectedCard?.color || selectedGroup?.color || activeColor}
        onColorChange={handleColorChange}
      />

      <div
        className="absolute top-4 left-4 p-3 rounded-xl text-xs max-w-xs z-10"
        style={{
          background: "color-mix(in srgb, var(--color-obsidian-surface) 90%, transparent)",
          border: "1px solid var(--color-obsidian-border)",
          backdropFilter: "blur(8px)",
          color: "var(--color-obsidian-muted-text)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>{note.title}</p>
        <p>Drag to pan. Scroll to zoom. Drag from the side dots to connect cards. Double-click to edit.</p>
      </div>
    </div>
  );
}
