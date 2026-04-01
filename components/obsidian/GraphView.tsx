"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Note, extractWikilinks, getNoteByTitle } from "./data";
import { ZoomIn, ZoomOut, Maximize2, Filter, Pause, Play, Move } from "lucide-react";

interface GraphViewProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteClick: (id: string) => void;
  isMobile?: boolean;
}

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  linkCount: number;
  fixed?: boolean;
  tags: string[];
  folder: string;
  type: string;
}

// Tag color palette
const TAG_COLORS: Record<string, string> = {
  programming: "#89b4fa",
  philosophy: "#cba6f7",
  math: "#f9e2af",
  physics: "#94e2d5",
  literature: "#f38ba8",
  history: "#fab387",
  science: "#a6e3a1",
  art: "#f5c2e7",
  music: "#89dceb",
  default: "#7c5cbf",
};

// Folder color palette
const FOLDER_COLORS: Record<string, string> = {
  inbox: "#f9e2af",
  projects: "#89b4fa",
  knowledge: "#a6e3a1",
  daily: "#cba6f7",
  archive: "#6c7086",
  default: "#7c5cbf",
};

function getTagColor(tags: string[]): string {
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    for (const [key, color] of Object.entries(TAG_COLORS)) {
      if (lowerTag.includes(key) || key.includes(lowerTag)) return color;
    }
  }
  return TAG_COLORS.default;
}

function getFolderColor(folder: string): string {
  const lowerFolder = folder.toLowerCase();
  for (const [key, color] of Object.entries(FOLDER_COLORS)) {
    if (lowerFolder.includes(key)) return color;
  }
  return FOLDER_COLORS.default;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface TouchState {
  mode: "none" | "pan" | "pinch" | "tap";
  startX: number;
  startY: number;
  startTx: number;
  startTy: number;
  startScale: number;
  startDist: number;
  lastTap: number;
  tapTimeout: ReturnType<typeof setTimeout> | null;
}

function buildGraph(notes: Note[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  notes.forEach((note) => {
    const links = extractWikilinks(note.content);
    links.forEach((title) => {
      const target = getNoteByTitle(notes, title);
      if (target) {
        const key = [note.id, target.id].sort().join("--");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: note.id, target: target.id });
        }
      }
    });
  });

  const linkCounts: Record<string, number> = {};
  edges.forEach(({ source, target }) => {
    linkCounts[source] = (linkCounts[source] || 0) + 1;
    linkCounts[target] = (linkCounts[target] || 0) + 1;
  });

  // Use a circle layout with jitter for initial positions
  const nodes: GraphNode[] = notes.map((note, i) => {
    const angle = (i / notes.length) * Math.PI * 2;
    const r = 140 + Math.random() * 60;
    const lc = linkCounts[note.id] || 0;
    return {
      id: note.id,
      title: note.title,
      x: Math.cos(angle) * r + (Math.random() - 0.5) * 50,
      y: Math.sin(angle) * r + (Math.random() - 0.5) * 50,
      vx: 0,
      vy: 0,
      radius: 8 + Math.min(lc * 2, 14), // Larger nodes for touch
      linkCount: lc,
      fixed: false,
      tags: note.tags,
      folder: note.folder || "",
      type: note.type || "markdown",
    };
  });

  return { nodes, edges };
}

function getTouchDistance(t1: React.Touch, t2: React.Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(t1: React.Touch, t2: React.Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export default function GraphView({ notes, activeNoteId, onNoteClick, isMobile = false }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  
  // Mouse drag state
  const draggingRef = useRef<{ active: boolean; startX: number; startY: number; tx: number; ty: number; nodeId: string | null }>({
    active: false, startX: 0, startY: 0, tx: 0, ty: 0, nodeId: null,
  });
  
  // Touch state for mobile
  const touchRef = useRef<TouchState>({
    mode: "none",
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    startScale: 1,
    startDist: 0,
    lastTap: 0,
    tapTimeout: null,
  });
  
  const hoveredNodeRef = useRef<string | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterFolder, setFilterFolder] = useState<string>("");
  const [showOrphans, setShowOrphans] = useState(true);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const simulatingRef = useRef(true);
  const alphaRef = useRef(1.0); // Temperature: decays to settle simulation smoothly
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<"links" | "tags" | "folders">("links");
  const [depthLimit, setDepthLimit] = useState<number>(0); // 0 = no limit

  const baseFilteredNotes = useMemo(() => notes.filter((n) => {
    if (!showOrphans) {
      const links = extractWikilinks(n.content);
      const hasOutgoing = links.some((t) => getNoteByTitle(notes, t));
      const hasIncoming = notes.some((other) => {
        if (other.id === n.id) return false;
        return extractWikilinks(other.content).some(
          (t) => t.toLowerCase() === n.title.toLowerCase()
        );
      });
      if (!hasOutgoing && !hasIncoming) return false;
    }
    if (filterTag && !n.tags.includes(filterTag)) return false;
    if (filterFolder && n.folder !== filterFolder) return false;
    return true;
  }), [notes, showOrphans, filterTag, filterFolder]);

  const filteredNotes = useMemo(() => {
    if (depthLimit === 0 || !activeNoteId) {
      return baseFilteredNotes;
    }

    const idSet = new Set(baseFilteredNotes.map((n) => n.id));
    if (!idSet.has(activeNoteId)) {
      return baseFilteredNotes;
    }

    const byId = new Map(baseFilteredNotes.map((n) => [n.id, n]));
    const titleToId = new Map(baseFilteredNotes.map((n) => [n.title.toLowerCase(), n.id]));
    const adjacency = new Map<string, Set<string>>();

    baseFilteredNotes.forEach((n) => adjacency.set(n.id, new Set<string>()));

    baseFilteredNotes.forEach((n) => {
      const outgoing = extractWikilinks(n.content);
      outgoing.forEach((title) => {
        const targetId = titleToId.get(title.toLowerCase());
        if (!targetId || !adjacency.has(targetId)) return;
        adjacency.get(n.id)?.add(targetId);
        adjacency.get(targetId)?.add(n.id);
      });
    });

    const queue: Array<{ id: string; depth: number }> = [{ id: activeNoteId, depth: 0 }];
    const visited = new Set<string>([activeNoteId]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.depth >= depthLimit) continue;
      const neighbors = adjacency.get(current.id);
      if (!neighbors) continue;
      neighbors.forEach((neighborId) => {
        if (visited.has(neighborId)) return;
        visited.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      });
    }

    return Array.from(visited).map((id) => byId.get(id)).filter(Boolean) as Note[];
  }, [baseFilteredNotes, depthLimit, activeNoteId]);

  const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort();
  const allFolders = [...new Set(notes.map((n) => n.folder).filter(Boolean))].sort();

  const initGraph = useCallback(() => {
    const { nodes, edges } = buildGraph(filteredNotes);
    stateRef.current = { nodes, edges };
    simulatingRef.current = physicsEnabled;
    alphaRef.current = 1.0;
    transformRef.current = { x: 0, y: 0, scale: isMobile ? 0.85 : 1 };
  }, [filteredNotes, physicsEnabled, isMobile]);

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  // Toggle physics
  useEffect(() => {
    simulatingRef.current = physicsEnabled;
  }, [physicsEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Physics constants - tuned for stability
    const REPULSION = 1800;
    const SPRING_K = 0.025;
    const REST_LEN = isMobile ? 90 : 110;
    const CENTER_K = 0.004;
    const DAMPING = 0.88;
    const MAX_VELOCITY = 12;
    const ALPHA_MIN = 0.001;
    const ALPHA_DECAY = 0.997;

    const tick = () => {
      const { nodes, edges } = stateRef.current;

      // Only run physics if enabled and alpha above threshold
      if (simulatingRef.current && physicsEnabled && alphaRef.current > ALPHA_MIN) {
        const alpha = alphaRef.current;

        // Build adjacency map for O(degree) edge lookup per node
        const adj = new Map<string, string[]>();
        nodes.forEach((n) => adj.set(n.id, []));
        edges.forEach(({ source, target }) => {
          adj.get(source)?.push(target);
          adj.get(target)?.push(source);
        });
        const physNodeMap = new Map(nodes.map((n) => [n.id, n]));

        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].fixed) continue;

          let fx = 0, fy = 0;

          // Repulsion between nodes (Coulomb-like with min distance)
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const d2 = dx * dx + dy * dy;
            const minDist = 30;
            const safeDist = Math.max(d2, minDist * minDist);
            const d = Math.sqrt(safeDist);
            const f = (REPULSION * alpha) / safeDist;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }

          // Springs along edges (Hooke's law) via adjacency
          const neighbors = adj.get(nodes[i].id) ?? [];
          for (const neighborId of neighbors) {
            const other = physNodeMap.get(neighborId);
            if (!other) continue;
            const dx = other.x - nodes[i].x;
            const dy = other.y - nodes[i].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const stretch = d - REST_LEN;
            fx += (dx / d) * SPRING_K * stretch * alpha;
            fy += (dy / d) * SPRING_K * stretch * alpha;
          }

          // Center gravity
          fx -= nodes[i].x * CENTER_K * alpha;
          fy -= nodes[i].y * CENTER_K * alpha;

          nodes[i].vx = (nodes[i].vx + fx) * DAMPING;
          nodes[i].vy = (nodes[i].vy + fy) * DAMPING;

          // Velocity clamping to prevent fly-off
          const speed = Math.sqrt(nodes[i].vx * nodes[i].vx + nodes[i].vy * nodes[i].vy);
          if (speed > MAX_VELOCITY) {
            nodes[i].vx = (nodes[i].vx / speed) * MAX_VELOCITY;
            nodes[i].vy = (nodes[i].vy / speed) * MAX_VELOCITY;
          }

          nodes[i].x += nodes[i].vx;
          nodes[i].y += nodes[i].vy;
        }

        // Cool down alpha
        alphaRef.current *= ALPHA_DECAY;
        if (alphaRef.current <= ALPHA_MIN) {
          simulatingRef.current = false;
        }
      }

      // Render - use CSS dimensions (context is already DPR-scaled)
      const cssWidth = canvas.offsetWidth;
      const cssHeight = canvas.offsetHeight;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const { x: tx, y: ty, scale } = transformRef.current;
      ctx.save();
      ctx.translate(cssWidth / 2 + tx, cssHeight / 2 + ty);
      ctx.scale(scale, scale);

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const hovered = hoveredNodeRef.current;
      const active = activeNoteId;
      const selected = selectedNode;

      // Draw edges
      edges.forEach(({ source, target }) => {
        const s = nodeMap.get(source);
        const t = nodeMap.get(target);
        if (!s || !t) return;
        const isConnectedToHovered = hovered && (source === hovered || target === hovered);
        const isConnectedToActive = active && (source === active || target === active);
        const isConnectedToSelected = selected && (source === selected || target === selected);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isConnectedToHovered || isConnectedToSelected
          ? "rgba(167,139,250,0.8)"
          : isConnectedToActive
          ? "rgba(124,92,191,0.6)"
          : "rgba(100,100,120,0.3)";
        ctx.lineWidth = isConnectedToHovered || isConnectedToSelected ? 2 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const isActive = node.id === active;
        const isHovered = node.id === hovered;
        const isSelected = node.id === selected;
        const nodeRadius = isMobile ? node.radius * 1.2 : node.radius; // Larger on mobile

        // Glow for active/hovered/selected
        if (isActive || isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 8, 0, Math.PI * 2);
          const grd = ctx.createRadialGradient(node.x, node.y, nodeRadius, node.x, node.y, nodeRadius + 10);
          grd.addColorStop(0, isActive ? "rgba(167,139,250,0.5)" : isSelected ? "rgba(99,179,237,0.5)" : "rgba(124,92,191,0.4)");
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Node circle with color mode
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        let nodeColor = "#4a4060";
        if (isActive) {
          nodeColor = "#a78bfa";
        } else if (isSelected) {
          nodeColor = "#63b3ed";
        } else if (isHovered) {
          nodeColor = "#9374d6";
        } else if (colorMode === "tags") {
          nodeColor = getTagColor(node.tags);
        } else if (colorMode === "folders") {
          nodeColor = getFolderColor(node.folder);
        } else {
          // Default: color by link count
          nodeColor = node.linkCount > 3 ? "#7c5cbf" : node.linkCount > 1 ? "#6d5899" : "#4a4060";
        }
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = isActive ? "#c4b5fd" : isSelected ? "#90cdf4" : isHovered ? "#a78bfa" : "rgba(167,139,250,0.2)";
        ctx.lineWidth = isActive || isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Label - bigger on mobile
        const fontSize = isMobile ? (isActive || isHovered || isSelected ? 13 : 12) : (isActive || isHovered ? 11 : 10);
        ctx.font = `${isActive || isSelected ? 600 : 400} ${fontSize}px 'Geist', system-ui, sans-serif`;
        ctx.fillStyle = isActive || isHovered || isSelected ? "#e2e8f0" : "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(
          node.title.length > 14 ? node.title.slice(0, 13) + "…" : node.title,
          node.x,
          node.y + nodeRadius + 15
        );
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeNoteId, notes, physicsEnabled, selectedNode, isMobile]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
    ro.observe(canvas);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    return () => ro.disconnect();
  }, []);

  // Get node at position (canvas coordinates)
  const getNodeAtPos = useCallback((ex: number, ey: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const { x: tx, y: ty, scale } = transformRef.current;
    const cx = (ex - canvas.offsetWidth / 2 - tx) / scale;
    const cy = (ey - canvas.offsetHeight / 2 - ty) / scale;
    const { nodes } = stateRef.current;
    const hitRadius = isMobile ? 20 : 8; // Much larger hit area on mobile
    for (const node of nodes) {
      const dx = cx - node.x;
      const dy = cy - node.y;
      const r = node.radius + hitRadius;
      if (dx * dx + dy * dy <= r * r) return node;
    }
    return null;
  }, [isMobile]);

  // ===== MOUSE HANDLERS (Desktop) =====
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;

    if (draggingRef.current.active) {
      if (draggingRef.current.nodeId) {
        // Dragging a node
        const { x: tx, y: ty, scale } = transformRef.current;
        const cx = (ex - (canvasRef.current?.offsetWidth || 0) / 2 - tx) / scale;
        const cy = (ey - (canvasRef.current?.offsetHeight || 0) / 2 - ty) / scale;
        const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
        if (node) {
          node.x = cx;
          node.y = cy;
          node.vx = 0;
          node.vy = 0;
        }
      } else {
        // Panning
        transformRef.current.x = draggingRef.current.tx + (ex - draggingRef.current.startX);
        transformRef.current.y = draggingRef.current.ty + (ey - draggingRef.current.startY);
      }
      return;
    }

    const node = getNodeAtPos(ex, ey);
    hoveredNodeRef.current = node?.id ?? null;
    setHoveredTitle(node?.title ?? null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? "pointer" : "grab";
    }
  }, [getNodeAtPos, isMobile]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const node = getNodeAtPos(ex, ey);
    
    draggingRef.current = {
      active: true,
      startX: ex,
      startY: ey,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
      nodeId: node?.id ?? null,
    };
    
    if (node) {
      node.fixed = true;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    }
  }, [getNodeAtPos, isMobile]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = Math.abs(e.clientX - rect.left - draggingRef.current.startX);
    const dy = Math.abs(e.clientY - rect.top - draggingRef.current.startY);

    // Release fixed node and restart simulation
    if (draggingRef.current.nodeId) {
      const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
      if (node) node.fixed = false;
      if (physicsEnabled) {
        alphaRef.current = Math.max(alphaRef.current, 0.3);
        simulatingRef.current = true;
      }
    }

    // Click detection
    if (draggingRef.current.active && dx < 4 && dy < 4) {
      const ex = e.clientX - rect.left;
      const ey = e.clientY - rect.top;
      const node = getNodeAtPos(ex, ey);
      if (node) onNoteClick(node.id);
    }
    
    draggingRef.current.active = false;
    draggingRef.current.nodeId = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, [getNodeAtPos, onNoteClick, isMobile]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    transformRef.current.scale = Math.max(0.15, Math.min(4, transformRef.current.scale * delta));
  }, []);

  // ===== TOUCH HANDLERS (Mobile) =====
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touches = e.touches;
    
    if (touches.length === 1) {
      const t = touches[0];
      const ex = t.clientX - rect.left;
      const ey = t.clientY - rect.top;
      const node = getNodeAtPos(ex, ey);
      
      // Check for double tap
      const now = Date.now();
      if (now - touchRef.current.lastTap < 300 && node) {
        // Double tap on node - navigate to it
        onNoteClick(node.id);
        touchRef.current.lastTap = 0;
        return;
      }
      touchRef.current.lastTap = now;
      
      if (node) {
        // Start dragging node
        setSelectedNode(node.id);
        node.fixed = true;
        draggingRef.current = {
          active: true,
          startX: ex,
          startY: ey,
          tx: transformRef.current.x,
          ty: transformRef.current.y,
          nodeId: node.id,
        };
      } else {
        // Start panning
        touchRef.current = {
          ...touchRef.current,
          mode: "pan",
          startX: t.clientX,
          startY: t.clientY,
          startTx: transformRef.current.x,
          startTy: transformRef.current.y,
        };
      }
    } else if (touches.length === 2) {
      // Pinch to zoom
      const dist = getTouchDistance(touches[0], touches[1]);
      touchRef.current = {
        ...touchRef.current,
        mode: "pinch",
        startDist: dist,
        startScale: transformRef.current.scale,
      };
      
      // Release any dragged node
      if (draggingRef.current.nodeId) {
        const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
        if (node) node.fixed = false;
        draggingRef.current.nodeId = null;
      }
    }
  }, [getNodeAtPos, onNoteClick]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scroll
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touches = e.touches;
    
    if (touches.length === 1 && draggingRef.current.nodeId) {
      // Dragging a node
      const t = touches[0];
      const ex = t.clientX - rect.left;
      const ey = t.clientY - rect.top;
      const { x: tx, y: ty, scale } = transformRef.current;
      const cx = (ex - (canvasRef.current?.offsetWidth || 0) / 2 - tx) / scale;
      const cy = (ey - (canvasRef.current?.offsetHeight || 0) / 2 - ty) / scale;
      const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
      if (node) {
        node.x = cx;
        node.y = cy;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (touches.length === 1 && touchRef.current.mode === "pan") {
      // Panning
      const t = touches[0];
      transformRef.current.x = touchRef.current.startTx + (t.clientX - touchRef.current.startX);
      transformRef.current.y = touchRef.current.startTy + (t.clientY - touchRef.current.startY);
    } else if (touches.length === 2 && touchRef.current.mode === "pinch") {
      // Pinch zoom
      const dist = getTouchDistance(touches[0], touches[1]);
      const scaleFactor = dist / touchRef.current.startDist;
      transformRef.current.scale = Math.max(0.15, Math.min(4, touchRef.current.startScale * scaleFactor));
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Release dragged node and restart simulation
    if (draggingRef.current.nodeId) {
      const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
      if (node) node.fixed = false;
      if (physicsEnabled) {
        alphaRef.current = Math.max(alphaRef.current, 0.3);
        simulatingRef.current = true;
      }
      draggingRef.current.nodeId = null;
      draggingRef.current.active = false;
    }
    
    // Reset touch state when all fingers lifted
    if (e.touches.length === 0) {
      touchRef.current.mode = "none";
    } else if (e.touches.length === 1) {
      // Went from 2 fingers to 1 - switch to pan
      const t = e.touches[0];
      touchRef.current = {
        ...touchRef.current,
        mode: "pan",
        startX: t.clientX,
        startY: t.clientY,
        startTx: transformRef.current.x,
        startTy: transformRef.current.y,
      };
    }
  }, []);

  // Zoom controls
  const zoom = (dir: 1 | -1) => {
    const delta = dir > 0 ? 1.25 : 0.8;
    transformRef.current.scale = Math.max(0.15, Math.min(4, transformRef.current.scale * delta));
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, scale: isMobile ? 0.85 : 1 };
    setSelectedNode(null);
    alphaRef.current = 1.0;
    simulatingRef.current = physicsEnabled;
  };

  const togglePhysics = () => {
    setPhysicsEnabled(v => {
      const next = !v;
      simulatingRef.current = next;
      if (next) alphaRef.current = Math.max(alphaRef.current, 0.5);
      return next;
    });
  };

  // Navigate to selected node
  const navigateToSelected = () => {
    if (selectedNode) {
      onNoteClick(selectedNode);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full" 
      style={{ background: "var(--color-obsidian-bg)", touchAction: "none" }}
    >
      {/* Toolbar - responsive */}
      <div
        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 border-b shrink-0 flex-wrap"
        style={{ borderColor: "var(--color-obsidian-border)", background: "var(--color-obsidian-surface)" }}
      >
        <span className="text-xs font-medium hidden md:inline" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Graph
        </span>
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {filteredNotes.length} notes
        </span>
        <div className="flex-1" />

        {/* Color mode selector */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Color:</span>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as "links" | "tags" | "folders")}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{
              background: "var(--color-obsidian-bg)",
              color: "var(--color-obsidian-text)",
              border: "1px solid var(--color-obsidian-border)",
              minHeight: "32px",
            }}
          >
            <option value="links">By Links</option>
            <option value="tags">By Tags</option>
            <option value="folders">By Folder</option>
          </select>
        </div>

        {/* Tag filter - hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--color-obsidian-muted-text)" }} />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{
              background: "var(--color-obsidian-bg)",
              color: "var(--color-obsidian-text)",
              border: "1px solid var(--color-obsidian-border)",
              minHeight: "32px",
            }}
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>

        {/* Folder filter - hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5">
          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{
              background: "var(--color-obsidian-bg)",
              color: "var(--color-obsidian-text)",
              border: "1px solid var(--color-obsidian-border)",
              minHeight: "32px",
            }}
            title="Filter by folder"
          >
            <option value="">All Folders</option>
            {allFolders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </div>

        {/* Depth limit slider */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>Depth:</span>
          <input
            type="range"
            min="0"
            max="5"
            value={depthLimit}
            onChange={(e) => setDepthLimit(parseInt(e.target.value))}
            className="w-16 h-1 accent-purple-500"
            style={{ cursor: "pointer" }}
            title={depthLimit === 0 ? "All" : `${depthLimit} levels`}
          />
          <span className="text-xs w-4" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {depthLimit === 0 ? "∞" : depthLimit}
          </span>
        </div>

        {/* Orphan toggle */}
        <button
          onClick={() => setShowOrphans((v) => !v)}
          className="text-xs px-2 py-1.5 rounded min-h-[32px] min-w-[32px]"
          style={{
            background: showOrphans ? "var(--color-obsidian-accent)" : "var(--color-obsidian-surface)",
            color: showOrphans ? "#fff" : "var(--color-obsidian-muted-text)",
            border: "1px solid var(--color-obsidian-border)",
          }}
          title="Toggle orphan notes"
        >
          <span className="hidden sm:inline">Orphans</span>
          <span className="sm:hidden">O</span>
        </button>

        {/* Physics toggle */}
        <button
          onClick={togglePhysics}
          className="p-1.5 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
          style={{ 
            color: physicsEnabled ? "var(--color-obsidian-accent)" : "var(--color-obsidian-muted-text)",
            background: physicsEnabled ? "rgba(167,139,250,0.15)" : "transparent",
            border: "1px solid var(--color-obsidian-border)",
          }}
          title={physicsEnabled ? "Pause physics" : "Enable physics"}
        >
          {physicsEnabled ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* Zoom controls - touch friendly sizes */}
        <button
          onClick={() => zoom(-1)}
          className="p-1.5 rounded hover:opacity-80 min-h-[32px] min-w-[32px] flex items-center justify-center"
          style={{ color: "var(--color-obsidian-muted-text)", border: "1px solid var(--color-obsidian-border)" }}
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => zoom(1)}
          className="p-1.5 rounded hover:opacity-80 min-h-[32px] min-w-[32px] flex items-center justify-center"
          style={{ color: "var(--color-obsidian-muted-text)", border: "1px solid var(--color-obsidian-border)" }}
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded hover:opacity-80 min-h-[32px] min-w-[32px] flex items-center justify-center"
          style={{ color: "var(--color-obsidian-muted-text)", border: "1px solid var(--color-obsidian-border)" }}
          title="Reset view"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ 
            display: "block", 
            cursor: isMobile ? "default" : "grab",
            touchAction: "none",
          }}
          // Mouse handlers (desktop)
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isMobile) return;
            hoveredNodeRef.current = null;
            setHoveredTitle(null);
            if (draggingRef.current.nodeId) {
              const node = stateRef.current.nodes.find(n => n.id === draggingRef.current.nodeId);
              if (node) node.fixed = false;
            }
            draggingRef.current.active = false;
            draggingRef.current.nodeId = null;
          }}
          onWheel={handleWheel}
          // Touch handlers (mobile)
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />
        
        {/* Hover tooltip (desktop) */}
        {!isMobile && hoveredTitle && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded text-xs pointer-events-none"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-text)",
            }}
          >
            {hoveredTitle}
          </div>
        )}

        {/* Selected node action (mobile) */}
        {isMobile && selectedNode && (
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-sm" style={{ color: "var(--color-obsidian-text)" }}>
              {stateRef.current.nodes.find(n => n.id === selectedNode)?.title || "Note"}
            </span>
            <button
              onClick={navigateToSelected}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{
                background: "var(--color-obsidian-accent)",
                color: "#fff",
              }}
            >
              Open
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-2 py-1.5 rounded text-xs"
              style={{
                background: "var(--color-obsidian-bg)",
                color: "var(--color-obsidian-muted-text)",
                border: "1px solid var(--color-obsidian-border)",
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Touch instructions (mobile only, shown briefly) */}
        {isMobile && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded text-xs pointer-events-none opacity-60"
            style={{
              background: "var(--color-obsidian-surface)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            <Move size={12} className="inline mr-1.5" />
            Drag to pan | Pinch to zoom | Tap node to select
          </div>
        )}

        {/* Legend - smaller on mobile */}
        <div
          className="absolute bottom-4 right-4 text-xs flex-col gap-1 p-2 rounded hidden md:flex"
          style={{
            background: "var(--color-obsidian-surface)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#a78bfa" }} />
            <span style={{ color: "var(--color-obsidian-muted-text)" }}>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#63b3ed" }} />
            <span style={{ color: "var(--color-obsidian-muted-text)" }}>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#7c5cbf" }} />
            <span style={{ color: "var(--color-obsidian-muted-text)" }}>Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#4a4060" }} />
            <span style={{ color: "var(--color-obsidian-muted-text)" }}>Leaf</span>
          </div>
        </div>
      </div>
    </div>
  );
}
