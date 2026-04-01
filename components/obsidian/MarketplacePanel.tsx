"use client";

import React, { useState, useMemo } from "react";
import {
  Search, Star, Download, CheckCircle, Plus, X, ExternalLink,
  Zap, Eye, Palette, GitBranch, PenTool, LayoutGrid, Sparkles, Filter
} from "lucide-react";
import {
  MARKETPLACE_ITEMS, MarketplaceItem, PluginCategory, formatDownloads
} from "./data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarketplacePanelProps {
  installedIds: string[];
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onClose: () => void;
}

type SortBy = "downloads" | "stars" | "name";

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: Array<{ id: PluginCategory | "all"; label: string; icon: React.ElementType }> = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "productivity", label: "Productivity", icon: Zap },
  { id: "visualization", label: "Visualization", icon: Eye },
  { id: "writing", label: "Writing", icon: PenTool },
  { id: "integration", label: "Integration", icon: GitBranch },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "editor", label: "Editor", icon: Sparkles },
];

// ─── Badge ────────────────────────────────────────────────────────────────────

function PriceBadge({ price }: { price: "free" | "paid" }) {
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
      style={{
        background: price === "paid" ? "rgba(249,226,175,0.15)" : "rgba(166,227,161,0.12)",
        color: price === "paid" ? "#f9e2af" : "#a6e3a1",
        border: `1px solid ${price === "paid" ? "rgba(249,226,175,0.25)" : "rgba(166,227,161,0.2)"}`,
      }}
    >
      {price === "paid" ? "Paid" : "Free"}
    </span>
  );
}

// ─── Plugin Card ─────────────────────────────────────────────────────────────

function PluginCard({
  item,
  installed,
  onInstall,
  onUninstall,
  onSelect,
}: {
  item: MarketplaceItem;
  installed: boolean;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onSelect: (item: MarketplaceItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setInstalling(true);
    // Simulate async install
    await new Promise((r) => setTimeout(r, 800));
    onInstall(item.id);
    setInstalling(false);
  };

  const handleUninstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUninstall(item.id);
  };

  const iconBg = installed
    ? "rgba(124,106,247,0.2)"
    : hovered
    ? "rgba(124,106,247,0.1)"
    : "var(--color-obsidian-bg)";

  return (
    <div
      className="p-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: hovered ? "var(--color-obsidian-surface-2)" : "var(--color-obsidian-bg)",
        border: `1px solid ${installed ? "rgba(124,106,247,0.35)" : "var(--color-obsidian-border)"}`,
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold transition-colors"
          style={{
            background: iconBg,
            color: installed ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
            border: `1px solid ${installed ? "rgba(124,106,247,0.3)" : "var(--color-obsidian-border)"}`,
          }}
        >
          {item.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--color-obsidian-text)" }}
            >
              {item.name}
            </span>
            <PriceBadge price={item.price} />
            {installed && (
              <span className="flex items-center gap-0.5 text-xs" style={{ color: "#a6e3a1" }}>
                <CheckCircle size={10} />
                Installed
              </span>
            )}
          </div>
          <p
            className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            {item.description}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className="text-xs flex items-center gap-0.5"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <Download size={9} />
              {formatDownloads(item.downloads)}
            </span>
            <span
              className="text-xs flex items-center gap-0.5"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <Star size={9} style={{ color: "#f9e2af" }} />
              {formatDownloads(item.stars)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              v{item.version}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 mt-0.5">
          {installed ? (
            <button
              onClick={handleUninstall}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
              style={{
                background: "rgba(243,139,168,0.1)",
                color: "#f38ba8",
                border: "1px solid rgba(243,139,168,0.25)",
              }}
            >
              <X size={11} />
              Remove
            </button>
          ) : (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80 disabled:opacity-60"
              style={{
                background: "var(--color-obsidian-accent)",
                color: "#fff",
              }}
            >
              {installing ? (
                <>
                  <div
                    className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin"
                  />
                  Installing
                </>
              ) : (
                <>
                  <Plus size={11} />
                  Install
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {hovered && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--color-obsidian-tag-bg)",
                color: "var(--color-obsidian-tag)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plugin Detail Drawer ─────────────────────────────────────────────────────

function PluginDetail({
  item,
  installed,
  onInstall,
  onUninstall,
  onClose,
}: {
  item: MarketplaceItem;
  installed: boolean;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ borderLeft: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-surface)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
          Plugin Details
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
              background: installed ? "rgba(124,106,247,0.2)" : "var(--color-obsidian-bg)",
              color: installed ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
              border: `1px solid ${installed ? "rgba(124,106,247,0.3)" : "var(--color-obsidian-border)"}`,
            }}
          >
            {item.icon}
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--color-obsidian-text)" }}>
              {item.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
              by {item.author} · v{item.version}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <PriceBadge price={item.price} />
              <span
                className="text-xs capitalize px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(137,180,250,0.1)",
                  color: "var(--color-obsidian-link)",
                  border: "1px solid rgba(137,180,250,0.2)",
                }}
              >
                {item.category}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Downloads", value: formatDownloads(item.downloads), icon: Download },
            { label: "Stars", value: formatDownloads(item.stars), icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="p-3 rounded-lg text-center"
              style={{
                background: "var(--color-obsidian-bg)",
                border: "1px solid var(--color-obsidian-border)",
              }}
            >
              <Icon size={14} className="mx-auto mb-1" style={{ color: "var(--color-obsidian-muted-text)" }} />
              <p className="text-base font-bold" style={{ color: "var(--color-obsidian-accent-soft)" }}>
                {value}
              </p>
              <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Description
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-obsidian-text)" }}>
            {item.description}
          </p>
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-obsidian-tag-bg)",
                  color: "var(--color-obsidian-tag)",
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* API endpoint reference */}
        <div
          className="p-3 rounded-lg"
          style={{
            background: "var(--color-obsidian-bg)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
            API Reference
          </p>
          <code className="text-xs font-mono block leading-relaxed" style={{ color: "var(--color-obsidian-code-text)" }}>
            GET /api/marketplace/plugins/{item.id}
            {"\n"}POST /api/marketplace/install/{item.id}
          </code>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0 flex flex-col gap-2"
        style={{ borderTop: "1px solid var(--color-obsidian-border)" }}
      >
        {installed ? (
          <button
            onClick={() => onUninstall(item.id)}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "rgba(243,139,168,0.15)", color: "#f38ba8", border: "1px solid rgba(243,139,168,0.3)" }}
          >
            Uninstall Plugin
          </button>
        ) : (
          <button
            onClick={() => onInstall(item.id)}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          >
            Install Plugin
          </button>
        )}
        <button
          className="w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-obsidian-bg)",
            color: "var(--color-obsidian-muted-text)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <ExternalLink size={13} />
          View on GitHub
        </button>
      </div>
    </div>
  );
}

// ─── Main Marketplace Panel ───────────────────────────────────────────────────

export default function MarketplacePanel({
  installedIds,
  onInstall,
  onUninstall,
  onClose,
}: MarketplacePanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PluginCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("downloads");
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let items = MARKETPLACE_ITEMS;
    if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.includes(q))
      );
    }
    return [...items].sort((a, b) => {
      if (sortBy === "downloads") return b.downloads - a.downloads;
      if (sortBy === "stars") return b.stars - a.stars;
      return a.name.localeCompare(b.name);
    });
  }, [search, activeCategory, sortBy]);

  const installedCount = MARKETPLACE_ITEMS.filter((i) => installedIds.includes(i.id)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl m-auto rounded-2xl overflow-hidden flex"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
          height: "min(90vh, 680px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Category rail */}
        <div
          className="w-44 flex flex-col py-3 shrink-0"
          style={{ borderRight: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
        >
          <div className="px-4 mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--color-obsidian-text)" }}>
              Marketplace
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
              {MARKETPLACE_ITEMS.length} plugins
            </p>
          </div>

          {/* Installed badge */}
          {installedCount > 0 && (
            <div
              className="mx-3 mb-3 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(124,106,247,0.12)",
                border: "1px solid rgba(124,106,247,0.25)",
              }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--color-obsidian-accent-soft)" }}>
                {installedCount} installed
              </p>
            </div>
          )}

          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left"
              style={{
                color:
                  activeCategory === id
                    ? "var(--color-obsidian-accent-soft)"
                    : "var(--color-obsidian-muted-text)",
                background:
                  activeCategory === id ? "rgba(124,106,247,0.12)" : "transparent",
                borderRight:
                  activeCategory === id
                    ? "2px solid var(--color-obsidian-accent)"
                    : "2px solid transparent",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Center: Plugin list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
          >
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: "var(--color-obsidian-bg)",
                border: "1px solid var(--color-obsidian-border)",
              }}
            >
              <Search size={13} style={{ color: "var(--color-obsidian-muted-text)", flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plugins…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--color-obsidian-text)" }}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={12} style={{ color: "var(--color-obsidian-muted-text)" }} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{
                color: showFilters ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                border: `1px solid ${showFilters ? "rgba(124,106,247,0.4)" : "var(--color-obsidian-border)"}`,
              }}
              title="Filters"
            >
              <Filter size={14} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div
              className="flex items-center gap-3 px-4 py-2 shrink-0"
              style={{ borderBottom: "1px solid var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
            >
              <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Sort by:
              </span>
              {(["downloads", "stars", "name"] as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className="text-xs px-2.5 py-1 rounded-full transition-colors capitalize"
                  style={{
                    background: sortBy === s ? "rgba(124,106,247,0.2)" : "transparent",
                    color: sortBy === s ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                    border: `1px solid ${sortBy === s ? "rgba(124,106,247,0.4)" : "var(--color-obsidian-border)"}`,
                  }}
                >
                  {s}
                </button>
              ))}
              <span className="ml-auto text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <Search size={32} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.4 }} />
                <p className="text-sm" style={{ color: "var(--color-obsidian-muted-text)" }}>
                  No plugins found for &ldquo;{search}&rdquo;
                </p>
              </div>
            )}
            {filtered.map((item) => (
              <PluginCard
                key={item.id}
                item={item}
                installed={installedIds.includes(item.id)}
                onInstall={onInstall}
                onUninstall={onUninstall}
                onSelect={setSelectedItem}
              />
            ))}
          </div>
        </div>

        {/* Right: Detail panel */}
        {selectedItem && (
          <div className="w-72 shrink-0 flex flex-col overflow-hidden">
            <PluginDetail
              item={selectedItem}
              installed={installedIds.includes(selectedItem.id)}
              onInstall={onInstall}
              onUninstall={onUninstall}
              onClose={() => setSelectedItem(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
