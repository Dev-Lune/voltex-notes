"use client";

import React from "react";
import {
  PanelLeft, PanelRight, Settings, Command, Cloud, CloudOff,
  RefreshCw, LogIn, ChevronLeft, ChevronRight, Info
} from "lucide-react";
import { AppState } from "./data";

interface TitleBarProps {
  state: AppState;
  onStateChange: (patch: Partial<AppState>) => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenUserInfo: () => void;
  onOpenWelcome: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

function SyncIndicator({ status }: { status: AppState["syncStatus"] }) {
  const map = {
    synced: { icon: Cloud, color: "#a6e3a1", label: "Synced to Firebase" },
    syncing: { icon: RefreshCw, color: "#f9e2af", label: "Syncing…" },
    offline: { icon: CloudOff, color: "#6c7086", label: "Offline" },
    error: { icon: CloudOff, color: "#f38ba8", label: "Sync error" },
  };
  const { icon: Icon, color, label } = map[status];
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
      style={{ color }}
      title={label}
    >
      <Icon size={12} className={status === "syncing" ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

export default function TitleBar({
  state,
  onStateChange,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenAuth,
  onOpenUserInfo,
  onOpenWelcome,
  onNavigateBack,
  onNavigateForward,
}: TitleBarProps) {
  const { sidebarCollapsed, rightPanelOpen, syncStatus, user, activeNoteId, notes } = state;
  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div
      className="flex items-center gap-2 px-3 h-11 shrink-0"
      style={{
        background: "var(--color-obsidian-bg)",
        borderBottom: "1px solid var(--color-obsidian-border)",
      }}
    >
      {/* App logo */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <div
          className="w-6 h-7 rounded-md flex items-center justify-center overflow-visible"
          style={{ background: "#111118" }}
        >
          <svg viewBox="0 0 82 116" width="14" height="20" fill="none">
            <polygon points="10,47 72,38 41,80" fill="#40C4FF"/>
            <polygon points="72,38 80,82 41,113 41,80" fill="#0D47A1"/>
            <polygon points="10,47 41,80 41,113 2,84" fill="#1976D2"/>
            <path d="M 47 2 L 35 2 L 27 17 L 38 17 L 29 33 L 55 33 L 59 17 L 46 17 Z" fill="#FFD600"/>
          </svg>
        </div>
        <span
          className="text-sm font-semibold hidden md:inline"
          style={{ color: "var(--color-obsidian-text)" }}
        >
          Voltex Notes
        </span>
      </div>

      {/* Nav buttons */}
      <button
        onClick={onNavigateBack}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Go back"
      >
        <ChevronLeft size={15} />
      </button>
      <button
        onClick={onNavigateForward}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Go forward"
      >
        <ChevronRight size={15} />
      </button>

      {/* Breadcrumb */}
      {activeNote && (
        <div
          className="hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded-md"
          style={{
            background: "var(--color-obsidian-surface)",
            color: "var(--color-obsidian-muted-text)",
          }}
        >
          <span>{activeNote.folder}</span>
          <span>/</span>
          <span style={{ color: "var(--color-obsidian-text)" }}>{activeNote.title}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Search shortcut */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          color: "var(--color-obsidian-muted-text)",
          minWidth: 160,
        }}
        title="Open command palette (Ctrl+P)"
      >
        <Command size={12} />
        <span className="flex-1 text-left">Search & commands…</span>
        <kbd
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{
            background: "var(--color-obsidian-bg)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          ⌘P
        </kbd>
      </button>

      {/* Sync indicator */}
      <SyncIndicator status={syncStatus} />

      {/* Panel toggles */}
      <button
        onClick={() => onStateChange({ sidebarCollapsed: !sidebarCollapsed })}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{
          color: sidebarCollapsed
            ? "var(--color-obsidian-muted-text)"
            : "var(--color-obsidian-accent-soft)",
        }}
        title="Toggle sidebar"
      >
        <PanelLeft size={15} />
      </button>
      <button
        onClick={() => onStateChange({ rightPanelOpen: !rightPanelOpen })}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{
          color: rightPanelOpen
            ? "var(--color-obsidian-accent-soft)"
            : "var(--color-obsidian-muted-text)",
        }}
        title="Toggle right panel"
      >
        <PanelRight size={15} />
      </button>

      <div className="w-px h-4" style={{ background: "var(--color-obsidian-border)" }} />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="Settings"
      >
        <Settings size={15} />
      </button>

      {/* Welcome / features */}
      <button
        onClick={onOpenWelcome}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        style={{ color: "var(--color-obsidian-muted-text)" }}
        title="About Voltex Notes"
      >
        <Info size={15} />
      </button>

      {/* Auth */}
      {!user ? (
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-obsidian-accent)",
            color: "#fff",
          }}
        >
          <LogIn size={12} />
          Sign in
        </button>
      ) : (
        <button
          onClick={onOpenUserInfo}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-opacity hover:opacity-80"
          style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          title={user.displayName}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </button>
      )}
    </div>
  );
}
