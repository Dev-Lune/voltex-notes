"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import {
  X, Settings, Puzzle, Cloud, Palette, Keyboard, User,
  Shield, Download, Upload, Trash2, RefreshCw, CheckCircle, ChevronRight,
  ExternalLink, Star, Check, Monitor, Sun, Feather, Pipette, RotateCcw, ChevronDown, ChevronUp, FolderOpen, FolderPlus, Cat
} from "lucide-react";
import {
  AppState, THEMES, ObsidianTheme, applyTheme, formatDownloads,
  CustomThemeColors, DEFAULT_CUSTOM_COLORS, COLOR_PALETTES, applyCustomColors, getColorsFromTheme,
  EditorPreferences, NoteType, MARKETPLACE_ITEMS, MarketplaceItem, PetType
} from "./data";
import { isElectron, appClient } from "@/lib/vault/client";

interface SettingsModalProps {
  state: AppState;
  onClose: () => void;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onSignOut: () => void;
  onDeleteAllData?: () => Promise<void> | void;
  onSyncStatusChange: (s: AppState["syncStatus"]) => void;
  onThemeChange: (id: string) => void;
  onPreferencesChange: (prefs: Partial<EditorPreferences>) => void;
  onOpenMarketplace: () => void;
  onImportNotes?: (files: { title: string; content: string; folder?: string }[]) => void;
  onSwitchVault?: () => void;
  onCreateVault?: () => void;
  onAppStateChange?: (patch: Partial<AppState>) => void;
}

type Tab =
  | "general"
  | "appearance"
  | "companion"
  | "cloud"
  | "plugins"
  | "hotkeys"
  | "account";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "general", icon: Settings, label: "General" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "companion", icon: Cat, label: "Companion" },
  { id: "cloud", icon: Cloud, label: "Cloud Sync" },
  { id: "plugins", icon: Puzzle, label: "Plugins" },
  { id: "hotkeys", icon: Keyboard, label: "Hotkeys" },
  { id: "account", icon: User, label: "Account" },
];

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  active,
  onApply,
}: {
  theme: ObsidianTheme;
  active: boolean;
  onApply: (theme: ObsidianTheme) => void;
}) {
  return (
    <div
      className="p-3 rounded-xl cursor-pointer transition-all group"
      style={{
        background: active ? "rgba(124,106,247,0.1)" : "var(--color-obsidian-bg)",
        border: `1px solid ${active ? "rgba(124,106,247,0.5)" : "var(--color-obsidian-border)"}`,
        boxShadow: active ? "0 0 0 2px rgba(124,106,247,0.2)" : "none",
      }}
      onClick={() => onApply(theme)}
    >
      {/* Color preview swatches */}
      <div className="flex items-center gap-1.5 mb-2">
        {theme.preview.map((c, i) => (
          <div
            key={i}
            className="rounded-md flex-1"
            style={{
              height: 28,
              background: c,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
            {theme.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {theme.description}
          </p>
          {theme.downloads ? (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
              <Download size={9} />
              {formatDownloads(theme.downloads)} downloads
            </p>
          ) : null}
        </div>
        {active && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--color-obsidian-accent)" }}
          >
            <Check size={11} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

type InterfaceMode = "dark" | "light" | "minimal";

const INTERFACE_MODE_THEMES: Record<InterfaceMode, string> = {
  dark: "obsidian-default",
  light: "light-paper",
  minimal: "nord",
};

// ─── Color Picker Component ───────────────────────────────────────────────────

interface ColorPickerProps {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
  palette?: string[];
}

function ColorPicker({ label, description, value, onChange, palette }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div className="relative">
      <div
        className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
        onClick={() => setShowPicker(!showPicker)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-105"
            style={{
              backgroundColor: value,
              borderColor: "rgba(255,255,255,0.15)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
              {label}
            </p>
            {description && (
              <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "var(--color-obsidian-bg)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            {value.toUpperCase()}
          </span>
          {showPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {showPicker && (
        <div
          className="mt-2 p-3 rounded-xl animate-slide-up"
          style={{
            background: "var(--color-obsidian-bg)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          {/* Native color input */}
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                style={{ padding: 0 }}
              />
              <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Pick any color
              </span>
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
              }}
              className="w-24 px-2 py-1.5 rounded-lg text-xs font-mono outline-none"
              style={{
                background: "var(--color-obsidian-surface)",
                border: "1px solid var(--color-obsidian-border)",
                color: "var(--color-obsidian-text)",
              }}
              placeholder="#000000"
            />
          </div>

          {/* Preset palette */}
          {palette && palette.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Suggested colors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {palette.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onChange(color);
                      setShowPicker(false);
                    }}
                    className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      border: value === color ? "2px solid var(--color-obsidian-accent)" : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: value === color ? "0 0 0 2px rgba(124,106,247,0.3)" : "none",
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Theme Customizer Component ───────────────────────────────────────────────

interface ThemeCustomizerProps {
  customColors: CustomThemeColors;
  onColorsChange: (colors: CustomThemeColors) => void;
  onReset: () => void;
}

function ThemeCustomizer({ customColors, onColorsChange, onReset }: ThemeCustomizerProps) {
  const [expanded, setExpanded] = useState(false);

  const updateColor = (key: keyof CustomThemeColors, value: string) => {
    const newColors = { ...customColors, [key]: value };
    onColorsChange(newColors);
    applyCustomColors(newColors);
  };

  const colorFields: {
    key: keyof CustomThemeColors;
    label: string;
    description: string;
    palette: string[];
  }[] = [
    { key: "background", label: "Background", description: "Main app background", palette: COLOR_PALETTES.backgrounds },
    { key: "surface", label: "Surface", description: "Panels and cards", palette: COLOR_PALETTES.surfaces },
    { key: "border", label: "Border", description: "Dividers and outlines", palette: COLOR_PALETTES.borders },
    { key: "text", label: "Text", description: "Primary text color", palette: COLOR_PALETTES.texts },
    { key: "muted", label: "Muted Text", description: "Secondary text", palette: COLOR_PALETTES.texts },
    { key: "accent", label: "Accent", description: "Primary brand color", palette: COLOR_PALETTES.accents },
    { key: "accentSoft", label: "Accent Soft", description: "Lighter accent for hovers", palette: COLOR_PALETTES.accents },
    { key: "link", label: "Links", description: "Wikilinks and URLs", palette: COLOR_PALETTES.links },
    { key: "tag", label: "Tags", description: "Tag text color", palette: COLOR_PALETTES.tags },
    { key: "codeBackground", label: "Code Background", description: "Code block background", palette: COLOR_PALETTES.backgrounds },
    { key: "codeText", label: "Code Text", description: "Code text color", palette: COLOR_PALETTES.tags },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--color-obsidian-bg)",
        border: "1px solid var(--color-obsidian-border)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(124,106,247,0.15)" }}
          >
            <Pipette size={16} style={{ color: "var(--color-obsidian-accent-soft)" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
              Custom Theme Editor
            </p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Create your own color scheme
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview swatches */}
          <div className="flex gap-1 mr-2">
            {[customColors.background, customColors.accent, customColors.text].map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: c, border: "1px solid rgba(255,255,255,0.1)" }}
              />
            ))}
          </div>
          {expanded ? (
            <ChevronUp size={16} style={{ color: "var(--color-obsidian-muted-text)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "var(--color-obsidian-muted-text)" }} />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Live preview */}
          <div
            className="mb-4 p-4 rounded-xl"
            style={{
              background: customColors.background,
              border: `1px solid ${customColors.border}`,
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: customColors.muted }}>
              LIVE PREVIEW
            </p>
            <h3 className="text-base font-bold mb-1" style={{ color: customColors.text }}>
              Sample Note Title
            </h3>
            <p className="text-sm mb-2" style={{ color: customColors.text }}>
              This is how your notes will look with the custom theme.{" "}
              <span style={{ color: customColors.link }}>[[Wikilink]]</span>{" "}
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: `${customColors.tag}20`, color: customColors.tag }}
              >
                #tag
              </span>
            </p>
            <div
              className="p-2 rounded text-xs font-mono"
              style={{ background: customColors.codeBackground, color: customColors.codeText }}
            >
              const greeting = &quot;Hello, Voltex!&quot;;
            </div>
            <button
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: customColors.accent, color: "#fff" }}
            >
              Accent Button
            </button>
          </div>

          {/* Reset button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <RotateCcw size={12} />
              Reset to default
            </button>
          </div>

          {/* Color pickers */}
          <div className="flex flex-col gap-1">
            {colorFields.map(({ key, label, description, palette }) => (
              <ColorPicker
                key={key}
                label={label}
                description={description}
                value={customColors[key]}
                onChange={(color) => updateColor(key, color)}
                palette={palette}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Companion Tab ────────────────────────────────────────────────────────────

const PET_OPTIONS: { id: PetType; label: string; emoji: string; tagline: string }[] = [
  { id: "cat", label: "Cat", emoji: "🐱", tagline: "Curious. Naps on headings." },
  { id: "fox", label: "Fox", emoji: "🦊", tagline: "Sneaky. Loves links." },
  { id: "dragon", label: "Dragon", emoji: "🐉", tagline: "Hoards your knowledge." },
  { id: "ghost", label: "Ghost", emoji: "👻", tagline: "Floats. Spooky friend." },
  { id: "alien", label: "Alien", emoji: "👽", tagline: "From planet Notes." },
  { id: "axolotl", label: "Axolotl", emoji: "🦎", tagline: "Wiggly. Mostly chill." },
];

function CompanionTab({
  petEnabled,
  petType,
  onPetEnabledChange,
  onPetTypeChange,
}: {
  petEnabled: boolean;
  petType: PetType;
  onPetEnabledChange: (v: boolean) => void;
  onPetTypeChange: (t: PetType) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
          Pet companion
        </h3>
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          A small intelligent creature that roams your editor. Reacts to clicks,
          chases your cursor, inspects headings and links. Drag to relocate.
        </p>
      </div>

      <label
        className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl cursor-pointer"
        style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
      >
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
            Enable companion
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Hidden by default. Off on mobile.
          </div>
        </div>
        <input
          type="checkbox"
          checked={petEnabled}
          onChange={(e) => onPetEnabledChange(e.target.checked)}
          className="w-5 h-5 cursor-pointer accent-[var(--color-obsidian-accent)]"
          aria-label="Enable pet companion"
        />
      </label>

      <div>
        <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Choose your companion
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PET_OPTIONS.map((opt) => {
            const active = petType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onPetTypeChange(opt.id)}
                className="flex flex-col items-start text-left p-3 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-obsidian-accent)]"
                style={{
                  background: active ? "color-mix(in srgb, var(--color-obsidian-accent) 14%, transparent)" : "var(--color-obsidian-bg)",
                  border: active ? "1px solid var(--color-obsidian-accent)" : "1px solid var(--color-obsidian-border)",
                }}
                aria-pressed={active}
              >
                <span className="text-3xl mb-1.5" aria-hidden>{opt.emoji}</span>
                <span className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>{opt.label}</span>
                <span className="text-[11px]" style={{ color: "var(--color-obsidian-muted-text)" }}>{opt.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="px-4 py-3 rounded-xl text-xs"
        style={{ background: "color-mix(in srgb, var(--color-obsidian-accent) 8%, transparent)", border: "1px solid var(--color-obsidian-border)", color: "var(--color-obsidian-muted-text)" }}
      >
        <strong style={{ color: "var(--color-obsidian-text)" }}>Tip — </strong>
        Click anywhere to make your companion leap toward the spot. Hover near
        it to make it chase your cursor. Drag it to a new home.
      </div>
    </div>
  );
}

function AppearanceTab({
  activeThemeId,
  onThemeChange,
  fontSize,
  onFontSizeChange,
}: {
  activeThemeId: string;
  onThemeChange: (id: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}) {
  const getCurrentMode = (): InterfaceMode => {
    if (activeThemeId === "light-paper") return "light";
    if (activeThemeId === "nord") return "minimal";
    return "dark";
  };
  
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(getCurrentMode);
  
  // Custom theme state
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    // Initialize from current theme
    const currentTheme = THEMES.find((t) => t.id === activeThemeId);
    return currentTheme ? getColorsFromTheme(currentTheme) : DEFAULT_CUSTOM_COLORS;
  });
  const [isCustomThemeActive, setIsCustomThemeActive] = useState(false);

  const handleApply = (theme: ObsidianTheme) => {
    applyTheme(theme);
    onThemeChange(theme.id);
    setIsCustomThemeActive(false);
    // Update custom colors to match the selected theme
    setCustomColors(getColorsFromTheme(theme));
  };

  const handleModeChange = (mode: InterfaceMode) => {
    setInterfaceMode(mode);
    const themeId = INTERFACE_MODE_THEMES[mode];
    const theme = THEMES.find((t) => t.id === themeId);
    if (theme) {
      applyTheme(theme);
      onThemeChange(theme.id);
      setIsCustomThemeActive(false);
      setCustomColors(getColorsFromTheme(theme));
    }
  };

  const handleCustomColorsChange = (colors: CustomThemeColors) => {
    setCustomColors(colors);
    setIsCustomThemeActive(true);
    // Apply immediately for live preview
    applyCustomColors(colors);
  };

  const handleResetCustomColors = () => {
    const currentTheme = THEMES.find((t) => t.id === activeThemeId);
    const defaultColors = currentTheme ? getColorsFromTheme(currentTheme) : DEFAULT_CUSTOM_COLORS;
    setCustomColors(defaultColors);
    setIsCustomThemeActive(false);
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Interface mode */}
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-obsidian-text)" }}>
          Interface Mode
        </p>
        <div className="flex gap-2">
          {[
            { id: "dark" as InterfaceMode, label: "Dark", icon: Monitor },
            { id: "light" as InterfaceMode, label: "Light", icon: Sun },
            { id: "minimal" as InterfaceMode, label: "Minimal", icon: Feather },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = interfaceMode === id && !isCustomThemeActive;
            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                style={{
                  background: isActive ? "rgba(124,106,247,0.15)" : "var(--color-obsidian-bg)",
                  border: `1px solid ${isActive ? "rgba(124,106,247,0.4)" : "var(--color-obsidian-border)"}`,
                  color: isActive ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                }}
              >
                <Icon size={16} />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Theme Editor */}
      <ThemeCustomizer
        customColors={customColors}
        onColorsChange={handleCustomColorsChange}
        onReset={handleResetCustomColors}
      />

      {/* Font size */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-obsidian-text)" }}>
          Font Size
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>A</span>
          <input
            type="range"
            min={12}
            max={24}
            step={1}
            value={fontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            className="flex-1 accent-[var(--color-obsidian-accent)] h-1.5 cursor-pointer"
            style={{ accentColor: "var(--color-obsidian-accent)" }}
          />
          <span className="text-lg font-bold" style={{ color: "var(--color-obsidian-muted-text)" }}>A</span>
          <span className="text-xs ml-1 font-mono w-8 text-right" style={{ color: "var(--color-obsidian-muted-text)" }}>{fontSize}px</span>
        </div>
      </div>

      {/* Themes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
            Themes
          </p>
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {THEMES.length} available
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              active={activeThemeId === theme.id}
              onApply={handleApply}
            />
          ))}
        </div>
      </div>

      {/* Custom CSS */}
      <CustomCSSEditor />
    </div>
  );
}

function CustomCSSEditor() {
  const [css, setCss] = useState(() => {
    const el = document.getElementById("obsidian-custom-css");
    return el?.textContent ?? "";
  });

  const applyCSS = (value: string) => {
    setCss(value);
    let el = document.getElementById("obsidian-custom-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "obsidian-custom-css";
      document.head.appendChild(el);
    }
    el.textContent = value;
  };

  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-obsidian-text)" }}>
        Custom CSS
      </p>
      <textarea
        value={css}
        onChange={(e) => applyCSS(e.target.value)}
        placeholder="/* Add your own CSS overrides here */"
        rows={5}
        className="w-full resize-none rounded-lg p-3 text-xs font-mono outline-none"
        style={{
          background: "var(--color-obsidian-bg)",
          border: "1px solid var(--color-obsidian-border)",
          color: "var(--color-obsidian-code-text)",
          lineHeight: 1.6,
        }}
      />
      <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
        Custom CSS is applied live on top of the active theme.
      </p>
    </div>
  );
}

// ─── Plugins Tab ──────────────────────────────────────────────────────────────

function InstalledPluginCard({
  item,
  onUninstall,
}: {
  item: MarketplaceItem;
  onUninstall: (id: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg transition-colors"
      style={{
        background: "var(--color-obsidian-bg)",
        border: "1px solid rgba(124,106,247,0.3)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm"
        style={{
          background: "rgba(124,106,247,0.18)",
          color: "var(--color-obsidian-accent-soft)",
        }}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
            {item.name}
          </span>
          <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            v{item.version}
          </span>
          <span
            className="text-xs flex items-center gap-0.5"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <Download size={10} />
            {formatDownloads(item.downloads)}
          </span>
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {item.description}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
          by {item.author}
        </p>
      </div>
      <button
        onClick={() => onUninstall(item.id)}
        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          background: "rgba(243,139,168,0.1)",
          color: "#f38ba8",
          border: "1px solid rgba(243,139,168,0.25)",
        }}
        title="Uninstall plugin"
      >
        Remove
      </button>
    </div>
  );
}

function PluginsTab({
  installedIds,
  onUninstall,
  onOpenMarketplace,
}: {
  installedIds: string[];
  onUninstall: (id: string) => void;
  onOpenMarketplace: () => void;
}) {
  const [search, setSearch] = useState("");
  const installed = MARKETPLACE_ITEMS.filter((item) => installedIds.includes(item.id));
  const filtered = installed.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
            Installed Plugins
          </h3>
          <button
            onClick={onOpenMarketplace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          >
            <Puzzle size={11} />
            Browse Marketplace
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {installed.length} of {MARKETPLACE_ITEMS.length} plugins installed. Uninstall to disable features.
        </p>
        {installed.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search installed plugins…"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-text)",
            }}
          />
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <InstalledPluginCard key={item.id} item={item} onUninstall={onUninstall} />
          ))}
        </div>
      ) : installed.length === 0 ? (
        <div className="py-8 text-center">
          <Puzzle size={28} style={{ color: "var(--color-obsidian-muted-text)", opacity: 0.5, margin: "0 auto 8px" }} />
          <p className="text-sm" style={{ color: "var(--color-obsidian-muted-text)" }}>
            No plugins installed yet.
          </p>
          <button
            onClick={onOpenMarketplace}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <p className="text-sm py-4 text-center" style={{ color: "var(--color-obsidian-muted-text)" }}>
          No matching plugins found.
        </p>
      )}
    </div>
  );
}

// ─── Cloud Tab ────────────────────────────────────────────────────────────────

function CloudTab({
  state,
  preferences,
  onSyncStatusChange,
  onPreferencesChange,
}: {
  state: AppState;
  preferences: EditorPreferences;
  onSyncStatusChange: (s: AppState["syncStatus"]) => void;
  onPreferencesChange: (prefs: Partial<EditorPreferences>) => void;
}) {
  const { syncStatus, user } = state;
  const statusMap = {
    synced: { color: "#a6e3a1", label: "All notes synced", icon: CheckCircle },
    syncing: { color: "#f9e2af", label: "Syncing changes…", icon: RefreshCw },
    offline: { color: "#6c7086", label: "Working offline", icon: Cloud },
    error: { color: "#f38ba8", label: "Sync error", icon: X },
  };
  const { color, label, icon: StatusIcon } = statusMap[syncStatus];

  return (
    <div className="flex flex-col gap-5">
      {/* Status card */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: "var(--color-obsidian-bg)", border: `1px solid ${color}40` }}
      >
        <StatusIcon
          size={20}
          className={syncStatus === "syncing" ? "animate-spin mt-0.5" : "mt-0.5"}
          style={{ color, flexShrink: 0 }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
            Firebase Sync
          </p>
          <p className="text-xs mt-0.5" style={{ color }}>
            {label}
          </p>
          {user && (
            <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
              Vault linked to {user.email}
            </p>
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => onSyncStatusChange("syncing")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity"
          style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
        >
          <RefreshCw size={11} />
          Force sync
        </button>
      </div>

      {/* Settings rows */}
      <div className="flex flex-col gap-1">
        <SettingRow
          label="Auto-sync interval"
          description="How often to push changes to Firebase"
          action={
            <InlineSelect
              value={preferences.autoSyncInterval}
              options={[
                { value: "instant", label: "Instant (real-time)" },
                { value: "5s", label: "Every 5 seconds" },
                { value: "30s", label: "Every 30 seconds" },
                { value: "manual", label: "Manual only" },
              ]}
              onChange={(v) => onPreferencesChange({ autoSyncInterval: v })}
            />
          }
        />
        <SettingRow
          label="Conflict resolution"
          description="How to handle simultaneous edits from multiple devices"
          action={
            <InlineSelect
              value={preferences.conflictResolution}
              options={[
                { value: "last-write", label: "Last write wins" },
                { value: "merge", label: "Auto-merge" },
                { value: "ask", label: "Ask each time" },
              ]}
              onChange={(v) => onPreferencesChange({ conflictResolution: v })}
            />
          }
        />
        <SettingRow
          label="Offline mode"
          description="Cache notes locally for offline access via IndexedDB"
          action={<ToggleSwitch checked={preferences.offlineMode} onChange={(v) => onPreferencesChange({ offlineMode: v })} />}
        />
        <SettingRow
          label="End-to-end encryption"
          description="Encrypt notes before uploading to Firestore"
          value="Coming soon"
        />
        <SettingRow
          label="Version history"
          description="Keep a 30-day history of note revisions"
          action={<ToggleSwitch checked={preferences.versionHistoryEnabled} onChange={(v) => onPreferencesChange({ versionHistoryEnabled: v })} />}
        />
        <SettingRow
          label="Selective sync"
          description="Choose which folders to sync to each device"
          action={
            <InlineSelect
              value={preferences.selectiveSync}
              options={[
                { value: "all", label: "All folders" },
                { value: "selected", label: "Selected only" },
              ]}
              onChange={(v) => onPreferencesChange({ selectiveSync: v })}
            />
          }
        />
      </div>

      {/* Firebase info */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
        >
          <Shield size={14} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
            Powered by Firebase
          </p>
          <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
            Firestore real-time database · Firebase Auth · 99.99% uptime SLA
          </p>
        </div>
        <ExternalLink size={13} className="ml-auto shrink-0" style={{ color: "var(--color-obsidian-muted-text)" }} />
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  value,
  action,
}: {
  label: string;
  description?: string;
  value?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start md:items-center flex-col md:flex-row gap-2 md:gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex-1">
        <p className="text-sm" style={{ color: "var(--color-obsidian-text)" }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {description}
          </p>
        )}
      </div>
      {!action && value && (
        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          {value}
        </span>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Toggle Switch (controlled) ──────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="shrink-0" aria-label="Toggle">
      <div
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ background: checked ? "var(--color-obsidian-accent)" : "var(--color-obsidian-border)" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
        />
      </div>
    </button>
  );
}

// ─── Inline Select ────────────────────────────────────────────────────────────

function InlineSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
      style={{
        background: "var(--color-obsidian-bg)",
        border: "1px solid var(--color-obsidian-border)",
        color: "var(--color-obsidian-text)",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── General Tab (functional) ─────────────────────────────────────────────────

function GeneralTab({
  preferences,
  folders,
  onPreferencesChange,
  onSwitchVault,
  onCreateVault,
}: {
  preferences: EditorPreferences;
  folders: { id: string; name: string }[];
  onPreferencesChange: (prefs: Partial<EditorPreferences>) => void;
  onSwitchVault?: () => void;
  onCreateVault?: () => void;
}) {
  const [appVersion, setAppVersion] = useState("1.0.0");
  useEffect(() => {
    if (isElectron()) {
      appClient.getVersion().then((v) => setAppVersion(v)).catch(() => {});
    }
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <SettingRow
        label="Default view"
        description="What opens when you launch the app"
        action={
          <InlineSelect
            value={preferences.defaultView}
            options={[
              { value: "last-used", label: "Last used" },
              { value: "editor", label: "Editor" },
              { value: "graph", label: "Graph view" },
            ]}
            onChange={(v) => onPreferencesChange({ defaultView: v })}
          />
        }
      />
      <SettingRow
        label="Default note location"
        description="Where new notes are created"
        action={
          <InlineSelect
            value={preferences.defaultNoteLocation}
            options={[
              { value: "root", label: "Vault root" },
              ...folders.filter((f) => f.id !== "root").map((f) => ({ value: f.id, label: f.name })),
            ]}
            onChange={(v) => onPreferencesChange({ defaultNoteLocation: v })}
          />
        }
      />
      <SettingRow
        label="Default note type"
        description="Note type created with Ctrl+N"
        action={
          <InlineSelect<NoteType>
            value={preferences.defaultNoteType}
            options={[
              { value: "markdown", label: "Markdown" },
              { value: "drawing", label: "Drawing" },
              { value: "daily", label: "Daily note" },
              { value: "kanban", label: "Kanban" },
            ]}
            onChange={(v) => onPreferencesChange({ defaultNoteType: v })}
          />
        }
      />
      <SettingRow
        label="Daily note format"
        description="Date format for daily note filenames"
        action={
          <InlineSelect
            value={preferences.dailyNoteFormat}
            options={[
              { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
              { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
              { value: "MM-DD-YYYY", label: "MM/DD/YYYY" },
              { value: "MMM-DD-YYYY", label: "Mon DD, YYYY" },
            ]}
            onChange={(v) => onPreferencesChange({ dailyNoteFormat: v })}
          />
        }
      />

      <div className="my-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />

      <SettingRow
        label="Auto-save"
        description="Save changes automatically as you type"
        action={<ToggleSwitch checked={preferences.autoSave} onChange={(v) => onPreferencesChange({ autoSave: v })} />}
      />
      <SettingRow
        label="Spell check"
        description="Underline misspelled words in the editor"
        action={<ToggleSwitch checked={preferences.spellCheck} onChange={(v) => onPreferencesChange({ spellCheck: v })} />}
      />
      <SettingRow
        label="Line numbers"
        description="Show line numbers in the markdown editor"
        action={<ToggleSwitch checked={preferences.lineNumbers} onChange={(v) => onPreferencesChange({ lineNumbers: v })} />}
      />
      <SettingRow
        label="Readable line length"
        description="Limit line width to ~80 chars for readability"
        action={<ToggleSwitch checked={preferences.readableLineLength} onChange={(v) => onPreferencesChange({ readableLineLength: v })} />}
      />
      <SettingRow
        label="Show frontmatter"
        description="Display YAML frontmatter block above note content"
        action={<ToggleSwitch checked={preferences.showFrontmatter} onChange={(v) => onPreferencesChange({ showFrontmatter: v })} />}
      />
      <SettingRow
        label="Vim key bindings"
        description="Enable Vim-style modal editing"
        action={<ToggleSwitch checked={preferences.vimMode} onChange={(v) => onPreferencesChange({ vimMode: v })} />}
      />

      <div className="my-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />

      <SettingRow
        label="Tab size"
        description="Number of spaces per indent level"
        action={
          <InlineSelect
            value={String(preferences.tabSize)}
            options={[
              { value: "2", label: "2 spaces" },
              { value: "4", label: "4 spaces" },
              { value: "8", label: "8 spaces" },
            ]}
            onChange={(v) => onPreferencesChange({ tabSize: parseInt(v) })}
          />
        }
      />

      {/* About section */}
      <div className="my-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />

      {onSwitchVault && (
        <SettingRow
          label="Vault"
          description="Open a different vault folder"
          action={
            <div className="flex gap-2">
              <button
                onClick={onSwitchVault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-text)",
                }}
              >
                <FolderOpen size={13} />
                Switch Vault
              </button>
              {onCreateVault && (
                <button
                  onClick={onCreateVault}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    background: "var(--color-obsidian-accent)",
                    color: "#fff",
                  }}
                >
                  <FolderPlus size={13} />
                  Create Vault
                </button>
              )}
            </div>
          }
        />
      )}

      <div className="my-2" style={{ borderTop: "1px solid var(--color-obsidian-border)" }} />

      <div className="py-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 82 116" width="20" height="28" fill="none">
            <polygon points="10,47 72,38 41,80" fill="var(--color-obsidian-accent)"/>
            <polygon points="72,38 80,82 41,113 41,80" fill="var(--color-obsidian-accent-soft)"/>
            <polygon points="10,47 41,80 41,113 2,84" fill="var(--color-obsidian-link)"/>
            <path d="M 47 2 L 35 2 L 27 17 L 38 17 L 29 33 L 55 33 L 59 17 L 46 17 Z" fill="var(--color-obsidian-text)"/>
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
              Voltex Notes
            </p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              v{appVersion} &middot; MIT License &middot; Open Source
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://devlune.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
              <path d="M13 7.5C12.1 10.6 9.2 12.9 5.8 12.9 2.2 12.9 -0.2 10 0 6.5 0.3 3.1 3 0.5 6.4 0.3 6.1 1.2 6 2.2 6 3.2 6 7.5 9.5 11 13.8 11 13.5 9.9 13.3 8.7 13 7.5Z" fill="var(--color-obsidian-muted-text)"/>
            </svg>
            A DevLune Studios project
          </a>
          <a
            href="https://github.com/Dev-Lune/voltex-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-obsidian-muted-text)">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a
            href="mailto:sidharth@devlune.in"
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-muted-text)",
            }}
          >
            sidharth@devlune.in
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Hotkeys Tab ──────────────────────────────────────────────────────────────

function HotkeysTab() {
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [customBindings, setCustomBindings] = useState<Record<string, string[]>>({});

  const hotkeys = [
    { action: "New note", keys: ["Ctrl", "N"] },
    { action: "New drawing note", keys: ["Ctrl", "Shift", "D"] },
    { action: "Open command palette", keys: ["Ctrl", "P"] },
    { action: "Quick switcher", keys: ["Ctrl", "O"] },
    { action: "Toggle edit / preview", keys: ["Ctrl", "E"] },
    { action: "Toggle split view", keys: ["Ctrl", "\\"] },
    { action: "Search in vault", keys: ["Ctrl", "F"] },
    { action: "Select all files", keys: ["Ctrl", "A"] },
    { action: "Open graph view", keys: ["Ctrl", "G"] },
    { action: "Toggle sidebar", keys: ["Ctrl", "B"] },
    { action: "Bold text", keys: ["Ctrl", "B"] },
    { action: "Italic text", keys: ["Ctrl", "I"] },
    { action: "Inline code", keys: ["Ctrl", "`"] },
    { action: "Open marketplace", keys: ["Ctrl", "Shift", "M"] },
    { action: "Force sync", keys: ["Ctrl", "Shift", "S"] },
    { action: "Delete selected element (Excalidraw)", keys: ["Del"] },
    { action: "Undo", keys: ["Ctrl", "Z"] },
    { action: "Redo", keys: ["Ctrl", "Y"] },
  ];

  const handleKeyCapture = (action: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    const key = e.key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
      setCustomBindings((prev) => ({ ...prev, [action]: parts }));
      setEditingAction(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Click any shortcut to rebind it. Press Escape to cancel.
        </p>
        {Object.keys(customBindings).length > 0 && (
          <button
            onClick={() => setCustomBindings({})}
            className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
            style={{ color: "var(--color-obsidian-accent-soft)" }}
          >
            Reset all
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {hotkeys.map(({ action, keys: defaultKeys }) => {
          const isEditing = editingAction === action;
          const currentKeys = customBindings[action] ?? defaultKeys;
          const isCustom = !!customBindings[action];
          return (
            <div
              key={action}
              className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: isEditing ? "rgba(124,106,247,0.12)" : undefined,
              }}
              onClick={() => setEditingAction(isEditing ? null : action)}
              onKeyDown={isEditing ? (e) => handleKeyCapture(action, e) : undefined}
              tabIndex={isEditing ? 0 : undefined}
              ref={(el) => { if (isEditing && el) el.focus(); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--color-obsidian-text)" }}>
                  {action}
                </span>
                {isCustom && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(124,106,247,0.15)", color: "var(--color-obsidian-accent-soft)" }}>
                    custom
                  </span>
                )}
              </div>
              {isEditing ? (
                <span className="text-xs px-2 py-1 rounded-lg animate-pulse" style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}>
                  Press new shortcut…
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  {currentKeys.map((k, i) => (
                    <React.Fragment key={k + i}>
                      {i > 0 && (
                        <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                          +
                        </span>
                      )}
                      <kbd
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: "var(--color-obsidian-bg)",
                          border: "1px solid var(--color-obsidian-border)",
                          color: "var(--color-obsidian-text)",
                        }}
                      >
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab({
  state,
  onSignOut,
  onImportNotes,
  onDeleteAllData,
}: {
  state: AppState;
  onSignOut: () => void;
  onImportNotes?: (files: { title: string; content: string; folder?: string }[]) => void;
  onDeleteAllData?: () => Promise<void> | void;
}) {
  const { user, notes, folders, syncStatus } = state;
  const [deletingAll, setDeletingAll] = useState(false);
  const storageKb = notes.reduce((acc, n) => acc + n.content.length, 0) / 1024;

  return (
    <div className="flex flex-col gap-5">
      {user ? (
        <div
          className="p-4 rounded-xl flex items-center gap-4"
          style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: "var(--color-obsidian-accent)", color: "#fff" }}
          >
            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
              {user.displayName}
            </p>
            <p className="text-sm" style={{ color: "var(--color-obsidian-muted-text)" }}>
              {user.email}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} style={{ color: "#f9e2af" }} />
              <span className="text-xs" style={{ color: "#f9e2af" }}>
                Pro Plan
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-obsidian-text)" }}>
            Local vault only
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
            You are not signed in. Your notes are stored only on this device until you enable cloud sync.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Notes", value: String(notes.length) },
          { label: "Folders", value: String(folders.filter((folder) => folder.id !== "root").length) },
          { label: "Sync", value: user ? syncStatus[0].toUpperCase() + syncStatus.slice(1) : "Local only" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="p-3 rounded-lg text-center"
            style={{ background: "var(--color-obsidian-bg)", border: "1px solid var(--color-obsidian-border)" }}
          >
            <p className="text-xl font-bold" style={{ color: "var(--color-obsidian-accent-soft)" }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={async () => {
            const zip = new JSZip();
            notes.forEach((n) => {
              const safeName = n.title.replace(/[<>:"/\\|?*]/g, "_");
              zip.file(`${safeName}.md`, n.content);
            });
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `voltex-vault-${new Date().toISOString().split("T")[0]}.zip`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
          style={{
            background: "var(--color-obsidian-surface-2)",
            color: "var(--color-obsidian-text)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <Download size={14} />
          Export vault
        </button>
        <button
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".md,.markdown,.txt";
            input.multiple = true;
            input.onchange = async () => {
              if (!input.files?.length) return;
              const imported: { title: string; content: string; folder?: string }[] = [];
              for (const file of Array.from(input.files)) {
                const content = await file.text();
                const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
                imported.push({ title, content });
              }
              onImportNotes?.(imported);
            };
            input.click();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
          style={{
            background: "var(--color-obsidian-surface-2)",
            color: "var(--color-obsidian-text)",
            border: "1px solid var(--color-obsidian-border)",
          }}
        >
          <Upload size={14} />
          Import markdown files
        </button>
        <button
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.setAttribute("webkitdirectory", "");
            input.setAttribute("directory", "");
            input.onchange = async () => {
              if (!input.files?.length) return;
              const imported: { title: string; content: string; folder?: string }[] = [];
              for (const file of Array.from(input.files)) {
                if (!file.name.match(/\.(md|markdown|txt)$/i)) continue;
                const content = await file.text();
                const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
                const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
                const parts = relPath.split("/");
                const folderName = parts.length > 2 ? parts.slice(1, -1).join("/") : undefined;
                imported.push({ title, content, folder: folderName });
              }
              if (imported.length > 0) onImportNotes?.(imported);
            };
            input.click();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
          style={{
            background: "var(--color-obsidian-accent)",
            color: "#fff",
          }}
        >
          <FolderOpen size={14} />
          Import vault folder
        </button>
        {user && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
            style={{
              background: "rgba(243,139,168,0.1)",
              color: "#f38ba8",
              border: "1px solid rgba(243,139,168,0.3)",
            }}
          >
            <Trash2 size={14} />
            Sign out
          </button>
        )}
      </div>

      <div
        className="p-4 rounded-xl"
        style={{
          background: "rgba(243,139,168,0.06)",
          border: "1px solid rgba(243,139,168,0.28)",
        }}
      >
        <p className="text-sm font-semibold" style={{ color: "#f38ba8" }}>
          Danger Zone
        </p>
        <p className="text-xs mt-1 mb-3" style={{ color: "var(--color-obsidian-muted-text)" }}>
          Permanently delete all notes, folders, local vault cache, and synced cloud data for this workspace.
        </p>
        <button
          onClick={async () => {
            if (!onDeleteAllData || deletingAll) return;
            try {
              setDeletingAll(true);
              await onDeleteAllData();
            } finally {
              setDeletingAll(false);
            }
          }}
          disabled={!onDeleteAllData || deletingAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "rgba(243,139,168,0.12)",
            color: "#f38ba8",
            border: "1px solid rgba(243,139,168,0.35)",
          }}
        >
          {deletingAll ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {deletingAll ? "Deleting data…" : "Delete all data"}
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SettingsModal({
  state,
  onClose,
  onInstall,
  onUninstall,
  onSignOut,
  onDeleteAllData,
  onSyncStatusChange,
  onThemeChange,
  onPreferencesChange,
  onOpenMarketplace,
  onImportNotes,
  onSwitchVault,
  onCreateVault,
  onAppStateChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="settings-modal-container relative w-full md:max-w-3xl md:mx-4 md:rounded-2xl overflow-hidden flex flex-col md:flex-row"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .settings-modal-container { height: 100dvh; max-height: 100dvh; border-radius: 0; }
          @media (min-width: 768px) {
            .settings-modal-container { height: auto; max-height: min(95dvh, 640px); border-radius: 1rem; }
          }
        `}</style>
        {/* Sidebar */}
        <div
          className="settings-tab-sidebar md:w-48 w-full flex md:flex-col flex-row md:py-4 py-0 shrink-0 overflow-x-auto md:overflow-x-visible"
          style={{ borderRight: undefined, background: "var(--color-obsidian-bg)" }}
        >
          <style>{`
            @media (min-width: 768px) {
              .settings-tab-sidebar { border-right: 1px solid var(--color-obsidian-border) !important; border-bottom: none !important; }
            }
            @media (max-width: 767px) {
              .settings-tab-sidebar { border-bottom: 1px solid var(--color-obsidian-border) !important; border-right: none !important; }
              .settings-tab-sidebar::-webkit-scrollbar { display: none; }
            }
          `}</style>
          <p
            className="px-4 text-xs font-semibold uppercase tracking-wider mb-3 hidden md:block"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            Settings
          </p>
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 md:gap-2.5 px-3 md:px-4 py-2.5 md:py-2 text-xs md:text-sm transition-colors text-left whitespace-nowrap shrink-0 flex-col md:flex-row"
              style={{
                color: activeTab === id ? "var(--color-obsidian-accent-soft)" : "var(--color-obsidian-muted-text)",
                background: activeTab === id ? "rgba(124,106,247,0.12)" : "transparent",
                borderBottom: activeTab === id ? "2px solid var(--color-obsidian-accent)" : "2px solid transparent",
              }}
            >
              <Icon size={16} />
              <span className="text-[10px] md:text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 shrink-0 safe-top"
            style={{ borderBottom: "1px solid var(--color-obsidian-border)" }}
          >
            <h2 className="text-sm md:text-base font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 pb-8 md:pb-5">
            {activeTab === "general" && (
              <GeneralTab
                preferences={state.preferences}
                folders={state.folders}
                onPreferencesChange={onPreferencesChange}
                onSwitchVault={onSwitchVault}
                onCreateVault={onCreateVault}
              />
            )}

            {activeTab === "appearance" && (
              <AppearanceTab
                activeThemeId={state.activeThemeId}
                onThemeChange={onThemeChange}
                fontSize={state.preferences.fontSize}
                onFontSizeChange={(size) => onPreferencesChange({ fontSize: size })}
              />
            )}

            {activeTab === "companion" && (
              <CompanionTab
                petEnabled={state.petEnabled ?? false}
                petType={state.petType ?? "cat"}
                onPetEnabledChange={(v) => onAppStateChange?.({ petEnabled: v })}
                onPetTypeChange={(t) => onAppStateChange?.({ petType: t })}
              />
            )}

            {activeTab === "cloud" && (
              <CloudTab
                state={state}
                preferences={state.preferences}
                onSyncStatusChange={onSyncStatusChange}
                onPreferencesChange={onPreferencesChange}
              />
            )}

            {activeTab === "plugins" && (
              <PluginsTab installedIds={state.installedPluginIds} onUninstall={onUninstall} onOpenMarketplace={onOpenMarketplace} />
            )}

            {activeTab === "hotkeys" && <HotkeysTab />}

            {activeTab === "account" && (
              <AccountTab
                state={state}
                onSignOut={onSignOut}
                onImportNotes={onImportNotes}
                onDeleteAllData={onDeleteAllData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
