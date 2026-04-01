"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Square, Circle, ArrowRight, Minus, Type, Pencil, MousePointer2,
  Eraser, ZoomIn, ZoomOut, Maximize2, Trash2, Download, Undo2, Redo2,
  Palette, Lock, Unlock, Grid3x3, StickyNote, Triangle
} from "lucide-react";
import { Note } from "./data";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "eraser"
  | "sticky";

type StrokeStyle = "solid" | "dashed" | "dotted";
type FillStyle = "none" | "solid" | "hatch" | "cross-hatch";

interface DrawElement {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  opacity: number;
  text?: string;
  points?: [number, number][];
  angle?: number;
  roughness?: number;
}

interface CanvasState {
  elements: DrawElement[];
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ExcalidrawCanvasProps {
  note: Note;
  onNoteChange: (id: string, patch: Partial<Note>) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PALETTE_COLORS = [
  "#ffffff", "#f8f8f2", "#cdd6f4", "#a6e3a1",
  "#89b4fa", "#cba6f7", "#f38ba8", "#fab387",
  "#f9e2af", "#94e2d5", "#7c6af7", "#1e1e2e",
];

const DEFAULT_STROKE = "#cdd6f4";
const DEFAULT_FILL = "none";
const GRID_SIZE = 20;

// Resolve CSS custom property to actual color value
function resolveColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function ToolButton({
  icon: Icon,
  title,
  active,
  onClick,
  kbd,
}: {
  icon: React.ElementType;
  title: string;
  active?: boolean;
  onClick: () => void;
  kbd?: string;
}) {
  return (
    <button
      title={`${title}${kbd ? ` (${kbd})` : ""}`}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 w-9 h-9 rounded-lg transition-all"
      style={{
        background: active ? "rgba(124,106,247,0.25)" : "transparent",
        border: active ? "1px solid rgba(124,106,247,0.5)" : "1px solid transparent",
        color: active ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
      }}
    >
      <Icon size={15} />
    </button>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 rounded-md transition-transform hover:scale-110"
      style={{
        background: color === "none" ? "transparent" : color,
        border: selected
          ? "2px solid var(--color-obsidian-accent)"
          : color === "none"
          ? "1px dashed var(--color-obsidian-muted-text)"
          : "1px solid rgba(255,255,255,0.15)",
        outline: selected ? "2px solid rgba(124,106,247,0.3)" : "none",
        outlineOffset: 1,
      }}
      title={color === "none" ? "Transparent" : color}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExcalidrawCanvas({
  note,
  onNoteChange,
}: ExcalidrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE);
  const [fillColor, setFillColor] = useState(DEFAULT_FILL);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeStyle] = useState<StrokeStyle>("solid");
  const [fillStyle] = useState<FillStyle>("none");
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"stroke" | "fill" | null>(null);

  // Drawing state
  const [elements, setElements] = useState<DrawElement[]>(() => {
    try {
      if (note.drawingData) {
        const parsed = JSON.parse(note.drawingData);
        return parsed.elements ?? [];
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Interaction refs
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const currentElementRef = useRef<DrawElement | null>(null);
  const freedrawPointsRef = useRef<[number, number][]>([]);

  // ── Persist to note ──────────────────────────────────────────────────────

  const persistElements = useCallback(
    (els: DrawElement[]) => {
      const data = JSON.stringify({ type: "excalidraw", version: 2, elements: els });
      onNoteChange(note.id, { drawingData: data, updatedAt: new Date().toISOString().split("T")[0] });
    },
    [note.id, onNoteChange]
  );

  // ── History ──────────────────────────────────────────────────────────────

  const pushHistory = useCallback(
    (els: DrawElement[]) => {
      setHistory((h) => {
        const newH = [...h.slice(0, historyIdx + 1), [...els]];
        return newH.slice(-50); // cap at 50
      });
      setHistoryIdx((i) => Math.min(i + 1, 49));
    },
    [historyIdx]
  );

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      const restored = history[newIdx];
      setElements(restored);
      persistElements(restored);
    }
  }, [history, historyIdx, persistElements]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      const restored = history[newIdx];
      setElements(restored);
      persistElements(restored);
    }
  }, [history, historyIdx, persistElements]);

  // ── Canvas helpers ───────────────────────────────────────────────────────

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      };
    },
    [offset, scale]
  );

  // ── Drawing ──────────────────────────────────────────────────────────────

  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, el: DrawElement) => {
      ctx.save();
      ctx.globalAlpha = el.opacity;
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.fillStyle = el.fillColor === "none" ? "transparent" : el.fillColor;

      if (el.strokeStyle === "dashed") ctx.setLineDash([8, 4]);
      else if (el.strokeStyle === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      const { x, y, width: w, height: h } = el;

      switch (el.type) {
        case "rectangle":
        case "sticky": {
          const r = 6;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          if (el.fillColor !== "none") ctx.fill();
          ctx.stroke();
          if (el.type === "sticky" && el.text) {
            ctx.fillStyle = el.strokeColor;
            ctx.font = `${12 * scale}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(el.text, x + w / 2, y + h / 2, w - 16);
          }
          break;
        }
        case "ellipse": {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
          if (el.fillColor !== "none") ctx.fill();
          ctx.stroke();
          break;
        }
        case "triangle": {
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          if (el.fillColor !== "none") ctx.fill();
          ctx.stroke();
          break;
        }
        case "diamond": {
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w / 2, y + h);
          ctx.lineTo(x, y + h / 2);
          ctx.closePath();
          if (el.fillColor !== "none") ctx.fill();
          ctx.stroke();
          break;
        }
        case "arrow": {
          const ex = x + w, ey = y + h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          // Arrowhead
          const angle = Math.atan2(ey - y, ex - x);
          const ah = 12 * el.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - ah * Math.cos(angle - 0.4), ey - ah * Math.sin(angle - 0.4));
          ctx.lineTo(ex - ah * Math.cos(angle + 0.4), ey - ah * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fillStyle = el.strokeColor;
          ctx.fill();
          break;
        }
        case "line": {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y + h);
          ctx.stroke();
          break;
        }
        case "freedraw": {
          if (!el.points || el.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(el.points[0][0], el.points[0][1]);
          for (let i = 1; i < el.points.length; i++) {
            const [px, py] = el.points[i];
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          break;
        }
        case "text": {
          ctx.font = `${14}px Inter, sans-serif`;
          ctx.fillStyle = el.strokeColor;
          ctx.textBaseline = "top";
          ctx.fillText(el.text ?? "", x, y, w || 200);
          break;
        }
      }

      // Selection indicator
      if (selectedId === el.id) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(124,106,247,0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        const pad = 4;
        ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
        // Resize handle
        ctx.fillStyle = "rgba(124,106,247,0.9)";
        ctx.fillRect(x + w - 4, y + h - 4, 8, 8);
      }

      ctx.restore();
    },
    [scale, selectedId]
  );

  // ── Render loop ──────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background — resolve theme color from CSS variable
    const bgColor = resolveColor("--color-obsidian-bg", "#1e1e2e");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Determine if theme is light or dark for grid visibility
    const isLight = bgColor.startsWith("#f") || bgColor.startsWith("#e") || bgColor.startsWith("#d") || bgColor.startsWith("#c");

    // Grid
    if (showGrid) {
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const gx = (offset.x % (GRID_SIZE * scale));
      const gy = (offset.y % (GRID_SIZE * scale));
      for (let x = gx; x < w; x += GRID_SIZE * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = gy; y < h; y += GRID_SIZE * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // Transform
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Elements
    elements.forEach((el) => drawElement(ctx, el));

    // Current drawing element
    if (currentElementRef.current) {
      drawElement(ctx, currentElementRef.current);
    }

    ctx.restore();
  }, [elements, offset, scale, showGrid, drawElement]);

  useEffect(() => {
    render();
  }, [render]);

  // ── Resize observer ──────────────────────────────────────────────────────

  useEffect(() => {
    const obs = new ResizeObserver(() => render());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [render]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "v") setActiveTool("select");
      if (e.key === "r") setActiveTool("rectangle");
      if (e.key === "c") setActiveTool("ellipse");
      if (e.key === "a") setActiveTool("arrow");
      if (e.key === "l") setActiveTool("line");
      if (e.key === "p") setActiveTool("freedraw");
      if (e.key === "t") setActiveTool("text");
      if (e.key === "e") setActiveTool("eraser");
      if (e.key === "Delete" && selectedId) {
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedId]);

  // ── Pointer events ───────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isLocked) return;
      const pos = toCanvas(e.clientX, e.clientY);

      // Middle button or Space+drag = pan
      if (e.button === 1 || activeTool === "select" && e.altKey) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        return;
      }

      if (activeTool === "select") {
        // Hit test
        const hit = [...elements].reverse().find((el) => {
          const rx = Math.min(el.x, el.x + el.width);
          const ry = Math.min(el.y, el.y + el.height);
          const rw = Math.abs(el.width);
          const rh = Math.abs(el.height);
          return pos.x >= rx - 6 && pos.x <= rx + rw + 6 && pos.y >= ry - 6 && pos.y <= ry + rh + 6;
        });
        setSelectedId(hit?.id ?? null);
        if (hit) {
          isDraggingRef.current = true;
          startPosRef.current = { x: pos.x - hit.x, y: pos.y - hit.y };
        }
        return;
      }

      if (activeTool === "eraser") {
        const hit = [...elements].reverse().find((el) => {
          const rx = Math.min(el.x, el.x + el.width);
          const ry = Math.min(el.y, el.y + el.height);
          const rw = Math.abs(el.width);
          const rh = Math.abs(el.height);
          return pos.x >= rx - 10 && pos.x <= rx + rw + 10 && pos.y >= ry - 10 && pos.y <= ry + rh + 10;
        });
        if (hit) {
          const next = elements.filter((el) => el.id !== hit.id);
          setElements(next);
          pushHistory(next);
          persistElements(next);
        }
        return;
      }

      isDrawingRef.current = true;
      startPosRef.current = pos;
      freedrawPointsRef.current = [[pos.x, pos.y]];

      const id = `el-${Date.now()}`;
      currentElementRef.current = {
        id,
        type: activeTool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        strokeColor,
        fillColor,
        strokeWidth,
        strokeStyle,
        fillStyle,
        opacity: 1,
        text: activeTool === "text" ? "Text" : activeTool === "sticky" ? "Note" : undefined,
        points: activeTool === "freedraw" ? [[pos.x, pos.y]] : undefined,
      };
    },
    [
      activeTool, elements, isLocked, offset, strokeColor, fillColor,
      strokeWidth, strokeStyle, fillStyle, toCanvas, pushHistory, persistElements,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) {
        setOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
        return;
      }

      const pos = toCanvas(e.clientX, e.clientY);

      if (isDraggingRef.current && selectedId) {
        setElements((prev) =>
          prev.map((el) =>
            el.id === selectedId
              ? { ...el, x: pos.x - startPosRef.current.x, y: pos.y - startPosRef.current.y }
              : el
          )
        );
        return;
      }

      if (!isDrawingRef.current || !currentElementRef.current) return;

      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;

      if (activeTool === "freedraw") {
        freedrawPointsRef.current.push([pos.x, pos.y]);
        currentElementRef.current = {
          ...currentElementRef.current,
          points: [...freedrawPointsRef.current],
        };
      } else {
        currentElementRef.current = {
          ...currentElementRef.current,
          width: dx,
          height: dy,
        };
      }
      render();
    },
    [activeTool, selectedId, toCanvas, render]
  );

  const handlePointerUp = useCallback(() => {
    if (isPanningRef.current) { isPanningRef.current = false; return; }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      pushHistory(elements);
      persistElements(elements);
      return;
    }

    if (!isDrawingRef.current || !currentElementRef.current) return;
    isDrawingRef.current = false;

    const el = currentElementRef.current;
    currentElementRef.current = null;

    // Discard tiny accidental draws
    const minSize = activeTool === "freedraw" ? 0 : 5;
    if (activeTool !== "freedraw" && Math.abs(el.width) < minSize && Math.abs(el.height) < minSize) {
      render();
      return;
    }

    const next = [...elements, el];
    setElements(next);
    pushHistory(next);
    persistElements(next);
    render();
  }, [activeTool, elements, pushHistory, persistElements, render]);

  // ── Wheel zoom ───────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      setScale((s) => Math.min(4, Math.max(0.2, s * delta)));
    },
    []
  );

  // ── Clear canvas ─────────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    setElements([]);
    pushHistory([]);
    persistElements([]);
    setSelectedId(null);
  }, [pushHistory, persistElements]);

  // ── Export PNG ───────────────────────────────────────────────────────────

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title}.png`;
    a.click();
  }, [note.title]);

  // ─────────────────────────────────────────────────────────────────────────

  const toolGroups: Array<Array<{ id: Tool; icon: React.ElementType; title: string; kbd?: string }>> = [
    [
      { id: "select", icon: MousePointer2, title: "Select", kbd: "V" },
      { id: "eraser", icon: Eraser, title: "Eraser", kbd: "E" },
    ],
    [
      { id: "rectangle", icon: Square, title: "Rectangle", kbd: "R" },
      { id: "ellipse", icon: Circle, title: "Ellipse", kbd: "C" },
      { id: "triangle", icon: Triangle, title: "Triangle" },
      { id: "diamond", icon: Square, title: "Diamond" },
      { id: "sticky", icon: StickyNote, title: "Sticky Note" },
    ],
    [
      { id: "arrow", icon: ArrowRight, title: "Arrow", kbd: "A" },
      { id: "line", icon: Minus, title: "Line", kbd: "L" },
    ],
    [
      { id: "freedraw", icon: Pencil, title: "Pencil", kbd: "P" },
      { id: "text", icon: Type, title: "Text", kbd: "T" },
    ],
  ];

  return (
    <div className="flex flex-col h-full w-full min-h-0" style={{ background: "var(--color-obsidian-bg)" }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-surface)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
          {note.title}
        </span>
        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.2, s / 1.2))}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span
            className="text-xs w-10 text-center font-mono"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(4, s * 1.2))}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-obsidian-muted-text)" }}
            title="Reset view"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        <div className="w-px h-4 mx-1" style={{ background: "var(--color-obsidian-border)" }} />

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid((v) => !v)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: showGrid ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)" }}
          title="Toggle grid"
        >
          <Grid3x3 size={14} />
        </button>

        {/* Lock */}
        <button
          onClick={() => setIsLocked((v) => !v)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: isLocked ? "#f38ba8" : "var(--color-obsidian-muted-text)" }}
          title={isLocked ? "Unlock canvas" : "Lock canvas"}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <div className="w-px h-4 mx-1" style={{ background: "var(--color-obsidian-border)" }} />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={historyIdx === 0}
          className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={historyIdx >= history.length - 1}
          className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: "var(--color-obsidian-border)" }} />

        {/* Export & clear */}
        <button
          onClick={exportPNG}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: "var(--color-obsidian-muted-text)" }}
          title="Export as PNG"
        >
          <Download size={14} />
        </button>
        <button
          onClick={clearCanvas}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: "#f38ba8" }}
          title="Clear canvas"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left toolbar */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 p-1.5 rounded-xl shadow-2xl"
          style={{
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          {toolGroups.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && (
                <div
                  className="my-0.5 h-px w-full"
                  style={{ background: "var(--color-obsidian-border)" }}
                />
              )}
              {group.map(({ id, icon, title, kbd }) => (
                <ToolButton
                  key={id}
                  icon={icon}
                  title={title}
                  kbd={kbd}
                  active={activeTool === id}
                  onClick={() => setActiveTool(id)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Color section */}
          <div className="my-0.5 h-px w-full" style={{ background: "var(--color-obsidian-border)" }} />
          <button
            onClick={() => setShowColorPicker((v) => (v === "stroke" ? null : "stroke"))}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            title="Stroke color"
          >
            <div className="w-5 h-5 rounded-md border-2 border-white/30" style={{ background: strokeColor }} />
          </button>
          <button
            onClick={() => setShowColorPicker((v) => (v === "fill" ? null : "fill"))}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            title="Fill color"
          >
            <Palette size={15} style={{ color: fillColor === "none" ? "var(--color-obsidian-muted-text)" : fillColor }} />
          </button>

          {/* Stroke width */}
          <div className="my-0.5 h-px w-full" style={{ background: "var(--color-obsidian-border)" }} />
          {[1, 2, 4].map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{
                background: strokeWidth === w ? "rgba(124,106,247,0.2)" : "transparent",
              }}
              title={`Stroke width ${w}px`}
            >
              <div
                className="rounded-full"
                style={{
                  width: `${Math.max(6, w * 4)}px`,
                  height: `${w + 1}px`,
                  background: strokeWidth === w ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                }}
              />
            </button>
          ))}
        </div>

        {/* Color picker popover */}
        {showColorPicker && (
          <div
            className="absolute left-16 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl shadow-2xl"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
            }}
          >
            <p
              className="text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              {showColorPicker === "stroke" ? "Stroke" : "Fill"}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {showColorPicker === "fill" && (
                <ColorSwatch
                  color="none"
                  selected={fillColor === "none"}
                  onClick={() => { setFillColor("none"); setShowColorPicker(null); }}
                />
              )}
              {PALETTE_COLORS.map((c) => (
                <ColorSwatch
                  key={c}
                  color={c}
                  selected={showColorPicker === "stroke" ? strokeColor === c : fillColor === c}
                  onClick={() => {
                    if (showColorPicker === "stroke") setStrokeColor(c);
                    else setFillColor(c);
                    setShowColorPicker(null);
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setShowColorPicker(null)}
              className="mt-2 w-full text-xs py-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              Close
            </button>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full"
          style={{
            cursor:
              activeTool === "select" ? "default"
              : activeTool === "eraser" ? "crosshair"
              : activeTool === "freedraw" ? "crosshair"
              : "crosshair",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Element count badge */}
        <div
          className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md"
          style={{
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-border)",
            color: "var(--color-obsidian-muted-text)",
          }}
        >
          {elements.length} element{elements.length !== 1 ? "s" : ""}
        </div>

        {/* Instructions overlay (empty canvas) */}
        {elements.length === 0 && !isDrawingRef.current && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <Pencil size={32} className="mb-3 opacity-30" />
            <p className="text-sm opacity-50">Select a tool and start drawing</p>
            <p className="text-xs opacity-30 mt-1">Scroll to zoom • Alt+drag to pan • Del to erase selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
