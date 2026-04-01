"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  FileText, Search, Share2, Plus, Settings, X, Menu,
  ChevronLeft, Cloud, CloudOff, RefreshCw, Pencil,
  CalendarDays, LayoutGrid, Home, MoreVertical, Star,
  Trash2, Edit3, Copy, FolderOpen, ArrowLeft, ChevronRight,
  PanelRight,
} from "lucide-react";
import { AppState, NoteType, Note } from "./data";

// ─── Haptic Feedback ──────────────────────────────────────────────────────────

function triggerHaptic(type: "light" | "medium" | "heavy" = "light") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
}

// ─── Pull to Refresh Hook ─────────────────────────────────────────────────────

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh(
  ref: React.RefObject<HTMLElement | null>,
  { onRefresh, threshold = 80 }: PullToRefreshOptions
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
    };

    const onTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic("medium");
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
      isPulling.current = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onRefresh, threshold, pullDistance, isRefreshing]);

  return { isRefreshing, pullDistance, isPulling: pullDistance > 0 };
}

// ─── Mobile Header ────────────────────────────────────────────────────────────

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onMenuOpen: () => void;
  onBack?: () => void;
  showBack?: boolean;
  syncStatus: AppState["syncStatus"];
  rightActions?: React.ReactNode;
  elevated?: boolean;
}

export function MobileHeader({
  title,
  subtitle,
  onMenuOpen,
  onBack,
  showBack,
  syncStatus,
  rightActions,
  elevated = false,
}: MobileHeaderProps) {
  const syncColors = {
    synced: "#a6e3a1",
    syncing: "#f9e2af",
    offline: "#6c7086",
    error: "#f38ba8",
  };

  return (
    <header
      className="mobile-header show-mobile-only"
      style={{
        boxShadow: elevated ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && onBack ? (
          <button
            onClick={() => { triggerHaptic(); onBack(); }}
            className="p-2 -ml-2 tap-target rounded-full active:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={22} style={{ color: "var(--color-obsidian-text)" }} />
          </button>
        ) : (
          <button
            onClick={() => { triggerHaptic(); onMenuOpen(); }}
            className="p-2 -ml-2 tap-target rounded-full active:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} style={{ color: "var(--color-obsidian-text)" }} />
          </button>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: "var(--color-obsidian-text)" }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="text-xs truncate"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Sync indicator */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full tap-target"
          style={{
            background: syncStatus === "synced" ? "rgba(166,227,161,0.1)" :
                       syncStatus === "syncing" ? "rgba(249,226,175,0.1)" :
                       "rgba(108,112,134,0.1)",
          }}
          aria-label={`Sync status: ${syncStatus}`}
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={14} className="animate-spin" style={{ color: syncColors[syncStatus] }} />
          ) : syncStatus === "synced" ? (
            <Cloud size={14} style={{ color: syncColors[syncStatus] }} />
          ) : (
            <CloudOff size={14} style={{ color: syncColors[syncStatus] }} />
          )}
          <span className="text-xs font-medium" style={{ color: syncColors[syncStatus] }}>
            {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing" : "Offline"}
          </span>
        </button>
        {rightActions}
      </div>
    </header>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────

type MobileView = "home" | "search" | "graph" | "new" | "settings" | "panel";

interface MobileBottomNavProps {
  activeView: MobileView;
  onNavigate: (view: MobileView) => void;
  onNewNoteMenu: () => void;
}

export function MobileBottomNav({ activeView, onNavigate, onNewNoteMenu }: MobileBottomNavProps) {
  const items = [
    { id: "home" as const, icon: Home, label: "Notes" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "new" as const, icon: Plus, label: "New", special: true },
    { id: "panel" as const, icon: PanelRight, label: "Panel" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <nav 
      className="mobile-bottom-nav show-mobile-only safe-bottom" 
      role="navigation" 
      aria-label="Main navigation"
    >
      {items.map(({ id, icon: Icon, label, special }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            onClick={() => {
              triggerHaptic();
              if (id === "new") {
                onNewNoteMenu();
              } else {
                onNavigate(id);
              }
            }}
            className={`mobile-nav-item ${isActive ? "active" : ""} tap-target`}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            {special ? (
              <div className="mobile-nav-fab">
                <Icon size={22} style={{ color: "#fff" }} />
              </div>
            ) : (
              <>
                <div className={`mobile-nav-icon ${isActive ? "active" : ""}`}>
                  <Icon size={22} />
                </div>
                <span className="mobile-nav-label">{label}</span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  side?: "left" | "right";
}

export function MobileDrawer({ isOpen, onClose, children, title, side = "left" }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Swipe to close
  useEffect(() => {
    const el = drawerRef.current;
    if (!el || !isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      currentX.current = e.touches[0].clientX;
      const diff = side === "left"
        ? startX.current - currentX.current
        : currentX.current - startX.current;
      if (diff > 0) {
        const translate = side === "left"
          ? `translateX(-${Math.min(diff, el.offsetWidth)}px)`
          : `translateX(${Math.min(diff, el.offsetWidth)}px)`;
        el.style.transform = translate;
      }
    };

    const onTouchEnd = () => {
      const diff = side === "left"
        ? startX.current - currentX.current
        : currentX.current - startX.current;
      if (diff > 100) {
        onClose();
      }
      el.style.transform = "";
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onClose, side]);

  const positionClass = side === "left"
    ? "left-0"
    : "right-0";
  const closedTransform = side === "left"
    ? "translateX(-100%)"
    : "translateX(100%)";
  const openTransform = "translateX(0)";

  return (
    <>
      {/* Scrim overlay */}
      <div
        className={`fixed inset-0 z-40 mobile-drawer-overlay ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0,
          backdropFilter: isOpen ? "blur(2px)" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 ${positionClass} bottom-0 z-50 w-[85%] max-w-[320px] mobile-drawer`}
        style={{
          background: "var(--color-obsidian-surface)",
          boxShadow: isOpen ? (side === "left" ? "4px 0 24px rgba(0,0,0,0.4)" : "-4px 0 24px rgba(0,0,0,0.4)") : "none",
          transform: isOpen ? openTransform : closedTransform,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Navigation drawer"}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 h-16 safe-top"
          style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--color-obsidian-accent), var(--color-obsidian-accent-soft))",
              }}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <path d="M10 2L3 7l7 11 7-11-7-5z" fill="rgba(255,255,255,0.95)" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base block" style={{ color: "var(--color-obsidian-text)" }}>
                {title || "Obsidian Cloud"}
              </span>
              <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Personal Vault
              </span>
            </div>
          </div>
          <button 
            onClick={() => { triggerHaptic(); onClose(); }} 
            className="p-2.5 tap-target rounded-full active:bg-white/10 transition-colors" 
            aria-label="Close menu"
          >
            <X size={20} style={{ color: "var(--color-obsidian-muted-text)" }} />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
}

export function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title,
  snapPoints = [0.5, 0.9]
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setCurrentSnap(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Drag to dismiss or snap
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;
      if (diff > 0) {
        el.style.transform = `translateY(${diff}px)`;
      }
    };

    const onTouchEnd = () => {
      const diff = currentY.current - startY.current;
      if (diff > 150) {
        triggerHaptic();
        onClose();
      }
      el.style.transform = "";
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onClose]);

  const [height, setHeight] = useState(400);

  useEffect(() => {
    setHeight(window.innerHeight * snapPoints[currentSnap]);
  }, [currentSnap, snapPoints]);

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-40 mobile-drawer-overlay ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl bottom-sheet ${isOpen ? "bottom-sheet-open" : "bottom-sheet-closed"}`}
        style={{
          background: "var(--color-obsidian-surface)",
          height: height,
          maxHeight: "90vh",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Bottom sheet"}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1.5 rounded-full"
            style={{ background: "var(--color-obsidian-border)" }}
          />
        </div>

        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
          >
            <span className="font-semibold text-base" style={{ color: "var(--color-obsidian-text)" }}>
              {title}
            </span>
            <button 
              onClick={() => { triggerHaptic(); onClose(); }} 
              className="p-2 -mr-2 tap-target rounded-full active:bg-white/10 transition-colors" 
              aria-label="Close"
            >
              <X size={20} style={{ color: "var(--color-obsidian-muted-text)" }} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain safe-bottom" style={{ maxHeight: "calc(100% - 80px)" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ─── New Note Type Menu ───────────────────────────────────────────────────────

interface NewNoteMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: NoteType) => void;
  installedPluginIds: string[];
}

export function NewNoteMenu({ isOpen, onClose, onSelect, installedPluginIds }: NewNoteMenuProps) {
  const types = [
    { id: "markdown" as NoteType, label: "Note", desc: "Rich text with wikilinks", icon: FileText, color: "#cdd6f4", pluginId: null as string | null },
    { id: "drawing" as NoteType, label: "Drawing", desc: "Excalidraw canvas", icon: Pencil, color: "#cba6f7", pluginId: "excalidraw" as string | null },
    { id: "daily" as NoteType, label: "Daily Note", desc: "Journal for today", icon: CalendarDays, color: "#f9e2af", pluginId: null as string | null },
    { id: "kanban" as NoteType, label: "Kanban", desc: "Task board", icon: LayoutGrid, color: "#89b4fa", pluginId: "obsidian-kanban" as string | null },
  ].filter(({ pluginId }) => !pluginId || installedPluginIds.includes(pluginId));

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Create New">
      <div className="p-4 flex flex-col gap-2">
        {types.map(({ id, label, desc, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => { 
              triggerHaptic("medium"); 
              onSelect(id); 
              onClose(); 
            }}
            className="flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98] transition-all"
            style={{ background: "var(--color-obsidian-bg)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1.5px solid ${color}25` }}
            >
              <Icon size={22} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-base font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
                {label}
              </p>
              <p className="text-sm" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {desc}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--color-obsidian-muted-text)" }} />
          </button>
        ))}
      </div>
    </MobileBottomSheet>
  );
}

// ─── Note Context Menu (Bottom Sheet) ─────────────────────────────────────────

interface NoteContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onStar: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
}

export function NoteContextMenu({
  isOpen,
  onClose,
  note,
  onStar,
  onDelete,
  onRename,
  onDuplicate,
  onMove,
}: NoteContextMenuProps) {
  if (!note) return null;

  const actions = [
    { id: "star", label: note.starred ? "Remove from favorites" : "Add to favorites", icon: Star, color: "#f9e2af", action: onStar },
    { id: "rename", label: "Rename", icon: Edit3, color: "#cdd6f4", action: onRename },
    { id: "duplicate", label: "Duplicate", icon: Copy, color: "#89b4fa", action: onDuplicate },
    { id: "move", label: "Move to folder", icon: FolderOpen, color: "#a6e3a1", action: onMove },
    { id: "delete", label: "Delete", icon: Trash2, color: "#f38ba8", action: onDelete, danger: true },
  ];

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={note.title}>
      <div className="p-3">
        {actions.map(({ id, label, icon: Icon, color, action, danger }) => (
          <button
            key={id}
            onClick={() => { triggerHaptic(); action(); onClose(); }}
            className="w-full flex items-center gap-4 p-3.5 rounded-xl active:bg-white/5 transition-colors"
          >
            <Icon size={20} style={{ color: danger ? "#f38ba8" : color }} />
            <span
              className="text-base"
              style={{ color: danger ? "#f38ba8" : "var(--color-obsidian-text)" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </MobileBottomSheet>
  );
}

// ─── useMobile hook ───────────────────────────────────────────────────────────

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

// ─── useSmallDesktop hook ─────────────────────────────────────────────────────

export function useSmallDesktop() {
  const [isSmallDesktop, setIsSmallDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1200px)");
    const update = () => setIsSmallDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isSmallDesktop;
}

export function useViewportWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

// ─── Swipe gesture hook ───────────────────────────────────────────────────────

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipe(ref: React.RefObject<HTMLElement | null>, handlers: SwipeHandlers) {
  const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Horizontal swipe
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (diffX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
      // Vertical swipe
      else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > threshold) {
        if (diffY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (diffY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}

// ─── Long Press Hook ──────────────────────────────────────────────────────────

export function useLongPress(
  callback: () => void,
  { delay = 500 }: { delay?: number } = {}
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const start = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      triggerHaptic("medium");
      callbackRef.current();
    }, delay);
  }, [delay]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
  };
}
