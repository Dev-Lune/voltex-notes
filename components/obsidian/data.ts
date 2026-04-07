// ─── Core Types ─────────────────────────────────────────────────────────────
export type NoteType = "markdown" | "drawing" | "kanban" | "table" | "daily";
export interface NoteVersion {
  id: string;
  content: string;
  title: string;
  savedAt: string;
  updatedAt: string;
}
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  pinned?: boolean;
  trashed?: boolean;
  trashedAt?: string;
  wordCount?: number;
  type?: NoteType;
  /** Serialized Excalidraw JSON for drawing notes */
  drawingData?: string;
  /** Newest-first content history snapshots for restore */
  versionHistory?: NoteVersion[];
  /** Absolute path to the .md file on disk (Electron only) */
  filePath?: string;
}
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  synced?: boolean;
}
/** A vault is a named container for notes and folders (web version). */
export interface Vault {
  id: string;
  name: string;
  createdAt: string;
}
export interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  official: boolean;
  downloads?: number;
  category?: PluginCategory;
  icon?: string;
  stars?: number;
}
export type PluginCategory =
  | "productivity"
  | "visualization"
  | "writing"
  | "integration"
  | "appearance"
  | "editor";
// ─── Themes ─────────────────────────────────────────────────────────────────
export interface ObsidianTheme {
  id: string;
  name: string;
  description: string;
  author: string;
  /** CSS variable overrides */
  vars: Record<string, string>;
  downloads?: number;
  preview: string[];
}
export const THEMES: ObsidianTheme[] = [
  {
    id: "voltex-dark",
    name: "Voltex Dark",
    description: "The signature Voltex theme — electric blue on deep charcoal.",
    author: "DevLune Studios",
    downloads: 0,
    preview: ["#0f1117", "#3b8ef5", "#d4d8e8"],
    vars: {
      "--obs-bg": "#0f1117",
      "--obs-surface": "#161822",
      "--obs-surface-2": "#1c1f2b",
      "--obs-border": "#262a38",
      "--obs-text": "#d4d8e8",
      "--obs-muted": "#5c6278",
      "--obs-accent": "#3b8ef5",
      "--obs-accent-soft": "#60a8ff",
      "--obs-link": "#5cc4ff",
      "--obs-tag": "#a48afb",
    },
  },
  {
    id: "obsidian-default",
    name: "Obsidian Default",
    description: "The classic deep-purple dark theme.",
    author: "Obsidian Cloud",
    downloads: 0,
    preview: ["#1e1e2e", "#7c6af7", "#cdd6f4"],
    vars: {
      "--obs-bg": "#1e1e2e",
      "--obs-surface": "#252535",
      "--obs-surface-2": "#2a2a3d",
      "--obs-border": "#353550",
      "--obs-text": "#cdd6f4",
      "--obs-muted": "#6c7086",
      "--obs-accent": "#7c6af7",
      "--obs-accent-soft": "#a78bfa",
      "--obs-link": "#89b4fa",
      "--obs-tag": "#cba6f7",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    description: "Soothing pastel dark theme inspired by Catppuccin.",
    author: "catppuccin",
    downloads: 520000,
    preview: ["#1e1e2e", "#cba6f7", "#cdd6f4"],
    vars: {
      "--obs-bg": "#181825",
      "--obs-surface": "#1e1e2e",
      "--obs-surface-2": "#252535",
      "--obs-border": "#313244",
      "--obs-text": "#cdd6f4",
      "--obs-muted": "#6c7086",
      "--obs-accent": "#cba6f7",
      "--obs-accent-soft": "#d9b4fe",
      "--obs-link": "#89b4fa",
      "--obs-tag": "#f38ba8",
    },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Arctic, north-bluish color palette.",
    author: "arcticicestudio",
    downloads: 310000,
    preview: ["#2e3440", "#88c0d0", "#eceff4"],
    vars: {
      "--obs-bg": "#2e3440",
      "--obs-surface": "#3b4252",
      "--obs-surface-2": "#434c5e",
      "--obs-border": "#4c566a",
      "--obs-text": "#eceff4",
      "--obs-muted": "#6c7086",
      "--obs-accent": "#88c0d0",
      "--obs-accent-soft": "#81a1c1",
      "--obs-link": "#5e81ac",
      "--obs-tag": "#a3be8c",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "A dark theme with vibrant accents and high contrast.",
    author: "dracula",
    downloads: 480000,
    preview: ["#282a36", "#bd93f9", "#f8f8f2"],
    vars: {
      "--obs-bg": "#282a36",
      "--obs-surface": "#21222c",
      "--obs-surface-2": "#2d2f3f",
      "--obs-border": "#44475a",
      "--obs-text": "#f8f8f2",
      "--obs-muted": "#6272a4",
      "--obs-accent": "#bd93f9",
      "--obs-accent-soft": "#ff79c6",
      "--obs-link": "#8be9fd",
      "--obs-tag": "#50fa7b",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    description: "Retro groove color scheme with warm earthy tones.",
    author: "morhetz",
    downloads: 290000,
    preview: ["#282828", "#d79921", "#ebdbb2"],
    vars: {
      "--obs-bg": "#282828",
      "--obs-surface": "#32302f",
      "--obs-surface-2": "#3c3836",
      "--obs-border": "#504945",
      "--obs-text": "#ebdbb2",
      "--obs-muted": "#928374",
      "--obs-accent": "#d79921",
      "--obs-accent-soft": "#fabd2f",
      "--obs-link": "#83a598",
      "--obs-tag": "#b8bb26",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "A clean, dark theme celebrating the lights of Tokyo at night.",
    author: "enkia",
    downloads: 420000,
    preview: ["#1a1b26", "#7aa2f7", "#c0caf5"],
    vars: {
      "--obs-bg": "#1a1b26",
      "--obs-surface": "#16161e",
      "--obs-surface-2": "#1f2335",
      "--obs-border": "#292e42",
      "--obs-text": "#c0caf5",
      "--obs-muted": "#565f89",
      "--obs-accent": "#7aa2f7",
      "--obs-accent-soft": "#bb9af7",
      "--obs-link": "#7dcfff",
      "--obs-tag": "#9ece6a",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    description: "Precision colors for machines and people — dark variant.",
    author: "altercation",
    downloads: 195000,
    preview: ["#002b36", "#268bd2", "#839496"],
    vars: {
      "--obs-bg": "#002b36",
      "--obs-surface": "#073642",
      "--obs-surface-2": "#0d3a46",
      "--obs-border": "#1a4a55",
      "--obs-text": "#839496",
      "--obs-muted": "#586e75",
      "--obs-accent": "#268bd2",
      "--obs-accent-soft": "#2aa198",
      "--obs-link": "#6c71c4",
      "--obs-tag": "#cb4b16",
    },
  },
  {
    id: "light-paper",
    name: "Paper Light",
    description: "A crisp light theme inspired by paper and ink.",
    author: "Obsidian Cloud",
    downloads: 85000,
    preview: ["#f5f0e8", "#5a7a9f", "#2c2c2c"],
    vars: {
      "--obs-bg": "#f5f0e8",
      "--obs-surface": "#ede8de",
      "--obs-surface-2": "#e4dfd4",
      "--obs-border": "#d0cab8",
      "--obs-text": "#2c2c2c",
      "--obs-muted": "#7a7060",
      "--obs-accent": "#5a7a9f",
      "--obs-accent-soft": "#4a8fa5",
      "--obs-link": "#2d6ea0",
      "--obs-tag": "#8b4a8b",
    },
  },
  {
    id: "one-dark",
    name: "One Dark Pro",
    description: "Atom's iconic dark theme — balanced, muted, and productive.",
    author: "atom",
    downloads: 370000,
    preview: ["#282c34", "#61afef", "#abb2bf"],
    vars: {
      "--obs-bg": "#282c34",
      "--obs-surface": "#21252b",
      "--obs-surface-2": "#2c313a",
      "--obs-border": "#3e4451",
      "--obs-text": "#abb2bf",
      "--obs-muted": "#636d83",
      "--obs-accent": "#61afef",
      "--obs-accent-soft": "#56b6c2",
      "--obs-link": "#c678dd",
      "--obs-tag": "#e06c75",
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "All natural pine, faux fur and a bit of soho vibes.",
    author: "rosé pine",
    downloads: 340000,
    preview: ["#191724", "#ebbcba", "#e0def4"],
    vars: {
      "--obs-bg": "#191724",
      "--obs-surface": "#1f1d2e",
      "--obs-surface-2": "#26233a",
      "--obs-border": "#403d52",
      "--obs-text": "#e0def4",
      "--obs-muted": "#6e6a86",
      "--obs-accent": "#ebbcba",
      "--obs-accent-soft": "#f6c177",
      "--obs-link": "#9ccfd8",
      "--obs-tag": "#c4a7e7",
    },
  },
  {
    id: "everforest",
    name: "Everforest",
    description: "A comfortable, green-based dark color scheme.",
    author: "sainnhe",
    downloads: 210000,
    preview: ["#2d353b", "#a7c080", "#d3c6aa"],
    vars: {
      "--obs-bg": "#2d353b",
      "--obs-surface": "#343f44",
      "--obs-surface-2": "#3d484d",
      "--obs-border": "#475258",
      "--obs-text": "#d3c6aa",
      "--obs-muted": "#859289",
      "--obs-accent": "#a7c080",
      "--obs-accent-soft": "#83c092",
      "--obs-link": "#7fbbb3",
      "--obs-tag": "#d699b6",
    },
  },
  {
    id: "ayu-dark",
    name: "Ayu Dark",
    description: "Modern dark theme with warm amber accents.",
    author: "ayu-theme",
    downloads: 260000,
    preview: ["#0a0e14", "#ffb454", "#b3b1ad"],
    vars: {
      "--obs-bg": "#0a0e14",
      "--obs-surface": "#0d1117",
      "--obs-surface-2": "#131721",
      "--obs-border": "#1c2433",
      "--obs-text": "#b3b1ad",
      "--obs-muted": "#626a73",
      "--obs-accent": "#ffb454",
      "--obs-accent-soft": "#e6b450",
      "--obs-link": "#59c2ff",
      "--obs-tag": "#d2a6ff",
    },
  },
  {
    id: "kanagawa",
    name: "Kanagawa",
    description: "Dark theme inspired by Katsushika Hokusai's The Great Wave.",
    author: "rebelot",
    downloads: 180000,
    preview: ["#1f1f28", "#dca561", "#dcd7ba"],
    vars: {
      "--obs-bg": "#1f1f28",
      "--obs-surface": "#2a2a37",
      "--obs-surface-2": "#363646",
      "--obs-border": "#54546d",
      "--obs-text": "#dcd7ba",
      "--obs-muted": "#727169",
      "--obs-accent": "#dca561",
      "--obs-accent-soft": "#e6c384",
      "--obs-link": "#7e9cd8",
      "--obs-tag": "#957fb8",
    },
  },
  {
    id: "moonlight",
    name: "Moonlight",
    description: "A cool-toned dark theme with soft lunar hues.",
    author: "atomiks",
    downloads: 160000,
    preview: ["#1e2030", "#82aaff", "#c8d3f5"],
    vars: {
      "--obs-bg": "#1e2030",
      "--obs-surface": "#222436",
      "--obs-surface-2": "#2f334d",
      "--obs-border": "#3b3f5c",
      "--obs-text": "#c8d3f5",
      "--obs-muted": "#636da6",
      "--obs-accent": "#82aaff",
      "--obs-accent-soft": "#c099ff",
      "--obs-link": "#86e1fc",
      "--obs-tag": "#fca7ea",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    description: "The dark theme from GitHub's code editor.",
    author: "github",
    downloads: 450000,
    preview: ["#0d1117", "#58a6ff", "#c9d1d9"],
    vars: {
      "--obs-bg": "#0d1117",
      "--obs-surface": "#161b22",
      "--obs-surface-2": "#21262d",
      "--obs-border": "#30363d",
      "--obs-text": "#c9d1d9",
      "--obs-muted": "#8b949e",
      "--obs-accent": "#58a6ff",
      "--obs-accent-soft": "#79c0ff",
      "--obs-link": "#a5d6ff",
      "--obs-tag": "#7ee787",
    },
  },
  {
    id: "material-ocean",
    name: "Material Ocean",
    description: "Deep oceanic Material Design dark theme.",
    author: "equinusocio",
    downloads: 280000,
    preview: ["#0f111a", "#84ffff", "#a6accd"],
    vars: {
      "--obs-bg": "#0f111a",
      "--obs-surface": "#1a1c25",
      "--obs-surface-2": "#1f2233",
      "--obs-border": "#2b2e3b",
      "--obs-text": "#a6accd",
      "--obs-muted": "#676e95",
      "--obs-accent": "#84ffff",
      "--obs-accent-soft": "#c792ea",
      "--obs-link": "#82aaff",
      "--obs-tag": "#f78c6c",
    },
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "A theme for the night owls — fine-tuned for accessibility.",
    author: "sarah.drasner",
    downloads: 390000,
    preview: ["#011627", "#7fdbca", "#d6deeb"],
    vars: {
      "--obs-bg": "#011627",
      "--obs-surface": "#0b2942",
      "--obs-surface-2": "#112c45",
      "--obs-border": "#1d3b53",
      "--obs-text": "#d6deeb",
      "--obs-muted": "#637777",
      "--obs-accent": "#7fdbca",
      "--obs-accent-soft": "#addb67",
      "--obs-link": "#82aaff",
      "--obs-tag": "#c792ea",
    },
  },
  {
    id: "palenight",
    name: "Palenight",
    description: "An elegant and juicy Material Design-inspired dark theme.",
    author: "equinusocio",
    downloads: 320000,
    preview: ["#292d3e", "#c792ea", "#a6accd"],
    vars: {
      "--obs-bg": "#292d3e",
      "--obs-surface": "#2f3344",
      "--obs-surface-2": "#34394f",
      "--obs-border": "#4e5579",
      "--obs-text": "#a6accd",
      "--obs-muted": "#676e95",
      "--obs-accent": "#c792ea",
      "--obs-accent-soft": "#f07178",
      "--obs-link": "#82aaff",
      "--obs-tag": "#ffcb6b",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "Precision colors for machines and people — light variant.",
    author: "altercation",
    downloads: 175000,
    preview: ["#fdf6e3", "#268bd2", "#657b83"],
    vars: {
      "--obs-bg": "#fdf6e3",
      "--obs-surface": "#eee8d5",
      "--obs-surface-2": "#e4ddc8",
      "--obs-border": "#d3cbb7",
      "--obs-text": "#657b83",
      "--obs-muted": "#93a1a1",
      "--obs-accent": "#268bd2",
      "--obs-accent-soft": "#2aa198",
      "--obs-link": "#6c71c4",
      "--obs-tag": "#cb4b16",
    },
  },
  {
    id: "vitesse-dark",
    name: "Vitesse Dark",
    description: "A clean, vibrant dark theme by Anthony Fu.",
    author: "antfu",
    downloads: 200000,
    preview: ["#121212", "#4fc1ff", "#dbd7ca"],
    vars: {
      "--obs-bg": "#121212",
      "--obs-surface": "#1a1a1a",
      "--obs-surface-2": "#222222",
      "--obs-border": "#2e2e2e",
      "--obs-text": "#dbd7ca",
      "--obs-muted": "#858585",
      "--obs-accent": "#4fc1ff",
      "--obs-accent-soft": "#80c7a5",
      "--obs-link": "#5eaab5",
      "--obs-tag": "#c98a7d",
    },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    description: "The warm light variant of the Catppuccin palette.",
    author: "catppuccin",
    downloads: 150000,
    preview: ["#eff1f5", "#8839ef", "#4c4f69"],
    vars: {
      "--obs-bg": "#eff1f5",
      "--obs-surface": "#e6e9ef",
      "--obs-surface-2": "#dce0e8",
      "--obs-border": "#ccd0da",
      "--obs-text": "#4c4f69",
      "--obs-muted": "#8c8fa1",
      "--obs-accent": "#8839ef",
      "--obs-accent-soft": "#7287fd",
      "--obs-link": "#1e66f5",
      "--obs-tag": "#ea76cb",
    },
  },
  {
    id: "poimandres",
    name: "Poimandres",
    description: "A minimal, dark blue theme — the calmest dark theme.",
    author: "pmndrs",
    downloads: 140000,
    preview: ["#1b1e28", "#a6accd", "#e4f0fb"],
    vars: {
      "--obs-bg": "#1b1e28",
      "--obs-surface": "#252a36",
      "--obs-surface-2": "#303340",
      "--obs-border": "#3a3e4d",
      "--obs-text": "#e4f0fb",
      "--obs-muted": "#767c9d",
      "--obs-accent": "#a6accd",
      "--obs-accent-soft": "#add7ff",
      "--obs-link": "#5de4c7",
      "--obs-tag": "#fcc5e9",
    },
  },
];
// ─── AppState ────────────────────────────────────────────────────────────────
export interface AppState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  openNoteIds: string[];
  sidebarView: "files" | "search" | "tags" | "bookmarks" | "trash" | "graph" | "marketplace";
  viewMode: "live" | "editor" | "preview";
  mainView: "editor" | "graph" | "drawing" | "canvas";
  rightPanelOpen: boolean;
  rightPanelTab: "backlinks" | "outline" | "properties" | "calendar" | "localgraph" | "heatmap" | "flashcards" | "mindmap";
  searchQuery: string;
  commandPaletteOpen: boolean;
  authModalOpen: boolean;
  settingsOpen: boolean;
  sidebarCollapsed: boolean;
  syncStatus: "synced" | "syncing" | "offline" | "error";
  user: { email: string; displayName: string; photoURL?: string; uid?: string } | null;
  activeThemeId: string;
  newNoteTypeMenuOpen: boolean;
  marketplaceOpen: boolean;
  installedPluginIds: string[];
  enabledSnippetIds: string[];
  preferences: EditorPreferences;
  /** Pomodoro timer state — only present when plugin is active */
  pomodoro?: { running: boolean; mode: "work" | "break"; secondsLeft: number; sessions: number; workMinutes: number; breakMinutes: number };
  /** Sliding panes mode — when true, show multiple notes side by side */
  slidingPanesEnabled?: boolean;
  /** Folder IDs that have been synced to cloud */
  syncedFolderIds?: string[];
  /** Active vault ID (web) — null means default vault */
  activeVaultId?: string;
}
// ─── Editor Preferences ──────────────────────────────────────────────────────
export interface EditorPreferences {
  defaultView: "editor" | "graph" | "last-used";
  defaultNoteLocation: string;          // folder id or "root"
  autoSave: boolean;
  spellCheck: boolean;
  lineNumbers: boolean;
  readableLineLength: boolean;
  vimMode: boolean;
  defaultNoteType: NoteType;
  dailyNoteFormat: string;
  fontSize: number;                     // px
  tabSize: number;
  showFrontmatter: boolean;
  autoSyncInterval: "instant" | "5s" | "30s" | "manual";
  conflictResolution: "last-write" | "merge" | "ask";
  offlineMode: boolean;
  versionHistoryEnabled: boolean;
  selectiveSync: "all" | "selected";
}
export const DEFAULT_PREFERENCES: EditorPreferences = {
  defaultView: "last-used",
  defaultNoteLocation: "root",
  autoSave: true,
  spellCheck: false,
  lineNumbers: false,
  readableLineLength: true,
  vimMode: false,
  defaultNoteType: "markdown",
  dailyNoteFormat: "YYYY-MM-DD",
  fontSize: 16,
  tabSize: 4,
  showFrontmatter: false,
  autoSyncInterval: "instant",
  conflictResolution: "last-write",
  offlineMode: true,
  versionHistoryEnabled: true,
  selectiveSync: "all",
};
// ─── Marketplace ─────────────────────────────────────────────────────────────
export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  author: string;
  version: string;
  category: PluginCategory;
  downloads: number;
  stars: number;
  icon: string;
  tags: string[];
  price: "free" | "paid";
}
export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Full-featured drawing and diagramming canvas. Create hand-drawn diagrams, wireframes, and sketches right in your vault.",
    longDescription: `Excalidraw brings a powerful whiteboard-style drawing canvas directly into your notes:
- Shape tools — Rectangle, ellipse, triangle, diamond, sticky notes
- Drawing tools — Freehand pencil, arrows, lines
- Text — Add labels and annotations anywhere
- Styling — 12-color palette, stroke width, fill options
- Canvas controls — Infinite pan/zoom, grid snap, lock mode
- History — Full undo/redo with Ctrl+Z/Y
- Export — Save drawings as PNG images
- Theme-aware — Adapts to your vault’s light or dark theme
Create a Drawing note from the new-note menu and start sketching instantly.`,
    author: "Sidharth",
    version: "1.0.0",
    category: "visualization",
    downloads: 3200000,
    stars: 6100,
    icon: "✏️",
    tags: ["drawing", "excalidraw", "whiteboard", "diagrams", "canvas"],
    price: "free",
  },
  {
    id: "advanced-tables",
    name: "Advanced Tables",
    description: "Improved table navigation, formatting, and spreadsheet-like formulas.",
    author: "tgrosinger",
    version: "0.22.1",
    category: "editor",
    downloads: 2100000,
    stars: 4800,
    icon: "T",
    tags: ["tables", "editor", "formatting"],
    price: "free",
  },
  {
    id: "obsidian-git",
    name: "Obsidian Git",
    description: "Backup your vault to a remote Git repository on a schedule.",
    author: "Vinzent03",
    version: "2.26.0",
    category: "integration",
    downloads: 1800000,
    stars: 5900,
    icon: "G",
    tags: ["git", "backup", "version control"],
    price: "free",
  },
  {
    id: "mind-map",
    name: "Mind Map",
    description: "View your notes as a mind map in the editor.",
    author: "lynchjames",
    version: "1.1.0",
    category: "visualization",
    downloads: 650000,
    stars: 2100,
    icon: "M",
    tags: ["mindmap", "graph", "visualization"],
    price: "free",
  },
  {
    id: "obsidian-kanban",
    name: "Kanban Board",
    description: "Create Kanban-style boards from your markdown notes.",
    author: "mgmeyers",
    version: "1.5.3",
    category: "productivity",
    downloads: 1200000,
    stars: 3700,
    icon: "K",
    tags: ["kanban", "tasks", "productivity"],
    price: "free",
  },
  {
    id: "natural-language-dates",
    name: "Natural Language Dates",
    description: "Create date-links by typing natural language like 'next Monday'.",
    author: "argenos",
    version: "0.6.1",
    category: "writing",
    downloads: 880000,
    stars: 2400,
    icon: "D",
    tags: ["dates", "daily notes", "natural language"],
    price: "free",
  },
  {
    id: "sliding-panes",
    name: "Sliding Panes",
    description: "Andy Matuschak-style sliding pane layout for linked notes.",
    author: "deathau",
    version: "3.4.0",
    category: "appearance",
    downloads: 740000,
    stars: 1900,
    icon: "S",
    tags: ["layout", "panes", "navigation"],
    price: "free",
  },
  {
    id: "spaced-repetition",
    name: "Spaced Repetition",
    description: "Review flashcards using spaced repetition directly in Obsidian.",
    author: "st3v3nmw",
    version: "1.10.3",
    category: "productivity",
    downloads: 430000,
    stars: 1600,
    icon: "R",
    tags: ["flashcards", "learning", "review"],
    price: "free",
  },
  {
    id: "ai-assistant",
    name: "AI Assistant Pro",
    description: "GPT-powered writing assistant, summarization, and note generation.",
    author: "ai-tools",
    version: "2.1.0",
    category: "writing",
    downloads: 210000,
    stars: 3200,
    icon: "A",
    tags: ["ai", "writing", "gpt"],
    price: "paid",
  },
  {
    id: "pomodoro",
    name: "Pomodoro Timer",
    description: "Built-in Pomodoro timer with note integration for focus sessions.",
    author: "tokuhirom",
    version: "1.5.0",
    category: "productivity",
    downloads: 390000,
    stars: 1100,
    icon: "P",
    tags: ["pomodoro", "focus", "timer"],
    price: "free",
  },
  {
    id: "citations",
    name: "Citations",
    description: "Manage academic citations and literature notes from BibTeX files.",
    author: "hans",
    version: "0.4.5",
    category: "writing",
    downloads: 280000,
    stars: 1300,
    icon: "C",
    tags: ["academic", "citations", "bibliography"],
    price: "free",
  },
  {
    id: "heatmap-calendar",
    name: "Heatmap Calendar",
    description: "GitHub-style heatmap calendar for your daily notes activity.",
    author: "Richardsl",
    version: "0.6.0",
    category: "visualization",
    downloads: 320000,
    stars: 980,
    icon: "H",
    tags: ["calendar", "heatmap", "statistics"],
    price: "free",
  },
  {
    id: "obsidian-publish-plus",
    name: "Publish Plus",
    description: "Publish your vault as a beautiful public website with custom domains.",
    author: "obsidian-cloud",
    version: "1.0.0",
    category: "integration",
    downloads: 95000,
    stars: 2800,
    icon: "W",
    tags: ["publish", "website", "sharing"],
    price: "paid",
  },
];
// ─── Folder structure ─────────────────────────────────────────────────────────
export const SAMPLE_FOLDERS: Folder[] = [
  { id: "root", name: "Vault", parentId: null },
  { id: "guides", name: "Guides", parentId: "root" },
  { id: "projects", name: "Projects", parentId: "root" },
  { id: "research", name: "Research", parentId: "root" },
  { id: "daily", name: "Daily Notes", parentId: "root" },
  { id: "drawings", name: "Drawings", parentId: "root" },
];
// ─── Sample Notes ─────────────────────────────────────────────────────────────

/** IDs of built-in documentation notes — excluded from cloud sync */
export const SAMPLE_NOTE_IDS = new Set([
  "getting-started", "wikilinks-guide", "graph-view", "daily-notes-template",
  "markdown-guide", "tags-system", "research-methods", "project-planning",
  "book-notes", "system-architecture", "marketplace-index",
  "calendar", "dataview", "templater", "excalidraw", "kanban",
  "tasks", "tag-wrangler", "quick-switcher",
]);

export const SAMPLE_NOTES: Note[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    folder: "guides",
    type: "markdown",
    tags: ["meta", "guide", "obsidian"],
    createdAt: "2024-01-15",
    updatedAt: "2024-03-20",
    starred: true,
    content: `# Getting Started with Obsidian Cloud
Welcome to your personal knowledge base — supercharged with real-time cloud sync.
## What is Obsidian Cloud?
Obsidian Cloud combines the power of local-first markdown editing with seamless Firebase synchronization. Your notes are always available, always up-to-date, and always private.
## Core Concepts
- **Bidirectional links** — Connect notes using [[Wikilinks Guide]] syntax
- **Graph view** — Visualize your entire knowledge network
- **Tags** — Organize with #guide #meta #obsidian
- **Cloud sync** — Real-time updates across all your devices
- **Offline access** — Works without internet, syncs when connected
- **Drawing notes** — Sketch diagrams with the built-in Excalidraw canvas
- **Marketplace** — Install community plugins to extend functionality
## Getting Around
1. Use the **left sidebar** to explore your vault
2. Open the [[Graph View]] to see note connections
3. Press \`Ctrl+P\` to open the command palette
4. Check [[Daily Notes Template]] for daily journaling
5. Click the **+** button to choose a new note type
## Note Types
| Type | Purpose |
|------|---------|
| Markdown | Default — rich text with [[wikilinks]] |
| Drawing | Excalidraw canvas for sketches & diagrams |
| Daily | Pre-formatted daily journal entry |
| Kanban | Task board with drag-and-drop columns |
## Themes
Switch between 8 built-in themes in Settings → Appearance:
Catppuccin, Nord, Dracula, Gruvbox, Tokyo Night, Solarized, Paper Light.
> **Tip:** Press \`Ctrl+E\` to toggle between edit and preview mode.`,
  },
  {
    id: "wikilinks-guide",
    title: "Wikilinks Guide",
    folder: "guides",
    type: "markdown",
    tags: ["guide", "linking", "syntax"],
    createdAt: "2024-01-16",
    updatedAt: "2024-03-18",
    starred: false,
    content: `# Wikilinks Guide
Wikilinks are the foundation of [[Getting Started|Obsidian's]] bidirectional linking system.
## Basic Syntax
\`[[Note Title]]\` — Link to any note in your vault
\`[[Note Title|Alias]]\` — Display custom text
\`[[Note Title#Heading]]\` — Link to a specific section
## How Backlinks Work
When you link to a note, that note gets a **backlink** automatically. Open the backlinks panel (right sidebar) to see all notes pointing to the current one. This is what makes [[Graph View]] so powerful.
## Unresolved Links
Links to non-existent notes appear dimmed. They still appear in the graph as orphan targets — a visual reminder to flesh out your ideas.
## Best Practices
- Link liberally — more connections = richer graph
- Use descriptive note titles for cleaner links
- Create index notes that link to related clusters
- See [[Tags System]] for complementary organization
Related: [[Markdown Guide]], [[Getting Started]]`,
  },
  {
    id: "graph-view",
    title: "Graph View",
    folder: "guides",
    type: "markdown",
    tags: ["guide", "visualization", "graph"],
    createdAt: "2024-01-17",
    updatedAt: "2024-03-15",
    starred: true,
    content: `# Graph View
The graph view renders your entire knowledge network as an interactive force-directed graph.
## Navigating the Graph
- **Click** a node to open that note
- **Drag** to pan the canvas
- **Scroll** to zoom in/out
- **Hover** a node to highlight its connections
## Node Appearance
| Size | Meaning |
|------|---------|
| Large | Many connections (hub note) |
| Medium | Some connections |
| Small | Isolated or few links |
## Filters
- Filter by **tag** to show only tagged notes
- Toggle **orphans** (unlinked notes)
- Search to highlight matching nodes
See [[Research Methods]] for tips on building a rich note graph.`,
  },
  {
    id: "daily-notes-template",
    title: "Daily Notes Template",
    folder: "daily",
    type: "daily",
    tags: ["template", "daily", "productivity"],
    createdAt: "2024-01-18",
    updatedAt: "2024-03-10",
    starred: false,
    content: `# Daily Notes Template
## {{date}} — Daily Note
### Morning Intentions
- [ ] Top priority for today:
- [ ] Secondary focus:
- [ ] One thing I am grateful for:
### Notes & Thoughts
*Write anything here — unfiltered. This is your thinking space.*
### Links & References
- Related to [[Getting Started]]
- Project: [[Project Planning]]
### Evening Reflection
- What went well?
- What could improve?
- Key insight of the day:`,
  },
  {
    id: "markdown-guide",
    title: "Markdown Guide",
    folder: "guides",
    type: "markdown",
    tags: ["guide", "markdown", "syntax", "reference"],
    createdAt: "2024-01-19",
    updatedAt: "2024-02-28",
    starred: false,
    content: `# Markdown Guide
A complete reference for markdown syntax supported in [[Getting Started|Obsidian Cloud]].
## Text Formatting
**Bold** — \`**text**\`
*Italic* — \`*text*\`
~~Strikethrough~~ — \`~~text~~\`
\`Inline code\` — \`\\\`code\\\`\`
## Headers
# H1, ## H2, ### H3, #### H4
## Lists
- Unordered item
- Another item
  - Nested
1. First
2. Second
- [x] Completed task
- [ ] Pending task
## Code Blocks
\`\`\`javascript
const greeting = "Hello, Obsidian!";
console.log(greeting);
\`\`\`
## Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
## Links
\`[Display Text](https://example.com)\` — External link
\`[[Note Title]]\` — Internal [[Wikilinks Guide|wikilink]]
See also: [[Wikilinks Guide]]`,
  },
  {
    id: "tags-system",
    title: "Tags System",
    folder: "guides",
    type: "markdown",
    tags: ["guide", "tags", "organization"],
    createdAt: "2024-01-20",
    updatedAt: "2024-03-05",
    starred: false,
    content: `# Tags System
Tags provide a flexible, non-hierarchical way to organize notes alongside [[Wikilinks Guide|wikilinks]].
## Adding Tags
Add tags inline anywhere in your note: #productivity #ideas #research
Or in the frontmatter using the Properties panel.
## Nested Tags
Use forward slashes for hierarchy:
- \`#project/alpha\`
- \`#book/fiction\`
- \`#status/active\`
## Tag Pane
The tags pane (left sidebar) shows all tags with note counts. Click any tag to filter notes.
## Tags vs Links
| Tags | Links |
|------|-------|
| Broad categories | Specific connections |
| Many-to-many | Contextual |
| Faceted search | Graph edges |
See [[Research Methods]] for tagging in research workflows.`,
  },
  {
    id: "research-methods",
    title: "Research Methods",
    folder: "research",
    type: "markdown",
    tags: ["research", "zettelkasten", "methodology", "productivity"],
    createdAt: "2024-01-22",
    updatedAt: "2024-03-22",
    starred: true,
    content: `# Research Methods
Notes on research methodology and the Zettelkasten method as implemented in [[Graph View]].
## The Zettelkasten Method
### Core Principles
1. **Atomic notes** — One idea per note
2. **In your own words** — Paraphrase, do not copy
3. **Always link** — Connect new notes to existing ones
4. **Build from bottom up** — Topics emerge from connections
### Note Types
| Type | Purpose |
|------|---------|
| Fleeting | Quick captures, temporary |
| Literature | Notes from sources |
| Permanent | Processed, atomic insights |
| Structure | Index/MOC notes |
## Capture → Process → Review
Capture fast, process deeply, review periodically. See [[Daily Notes Template]] for the daily workflow and [[Book Notes]] for literature note structure.
Feeds into: [[Project Planning]], [[Graph View]] structure analysis`,
  },
  {
    id: "project-planning",
    title: "Project Planning",
    folder: "projects",
    type: "markdown",
    tags: ["project", "planning", "productivity", "management"],
    createdAt: "2024-02-01",
    updatedAt: "2024-03-25",
    starred: false,
    content: `# Project Planning
Using Obsidian Cloud for project management alongside [[Daily Notes Template]].
## Project Note Structure
Each project gets a dedicated note with status, goal, context, next actions, decisions, and links.
## Status Tags
- \`#status/backlog\`
- \`#status/active\`
- \`#status/review\`
- \`#status/done\`
## Weekly Review
Every Sunday:
1. Review all \`#status/active\` projects
2. Check [[Daily Notes Template]] from the week
3. Update next actions
4. Archive completed items
Projects become rich hub nodes in your [[Graph View]].`,
  },
  {
    id: "book-notes",
    title: "Book Notes",
    folder: "research",
    type: "markdown",
    tags: ["books", "reading", "learning", "reference"],
    createdAt: "2024-02-10",
    updatedAt: "2024-03-20",
    starred: false,
    content: `# Book Notes
Master index of books read and their key insights. All notes feed back into [[Research Methods]].
## Currently Reading
- **How to Take Smart Notes** — Sönke Ahrens (#zettelkasten #productivity)
- **The Art of Learning** — Josh Waitzkin (#learning #mastery)
## Completed
- **Deep Work** — Cal Newport (#productivity)
- **Building a Second Brain** — Tiago Forte (#productivity #pkm)
- **Thinking, Fast and Slow** — Kahneman (#psychology #research)
## Book Note Template
For each book: summary, key ideas (linked), quotes, synthesis, action items. See [[Research Methods]] for the full reading workflow.`,
  },
  {
    id: "system-architecture",
    title: "System Architecture Diagram",
    folder: "drawings",
    type: "drawing",
    tags: ["diagram", "architecture", "drawing"],
    createdAt: "2024-03-01",
    updatedAt: "2024-03-26",
    starred: false,
    drawingData: JSON.stringify({
      type: "excalidraw",
      version: 2,
      elements: [
        { id: "el1", type: "rectangle", x: 100, y: 80, width: 140, height: 50, label: "Firebase" },
        { id: "el2", type: "rectangle", x: 320, y: 80, width: 140, height: 50, label: "Next.js App" },
        { id: "el3", type: "rectangle", x: 540, y: 80, width: 140, height: 50, label: "Obsidian Client" },
        { id: "el4", type: "arrow", x: 240, y: 105, width: 80, height: 0, label: "" },
        { id: "el5", type: "arrow", x: 460, y: 105, width: 80, height: 0, label: "" },
      ],
    }),
    content: "",
  },
  {
    id: "marketplace-index",
    title: "Marketplace Index",
    folder: "root",
    type: "markdown",
    tags: ["marketplace", "plugins", "meta"],
    createdAt: "2024-03-05",
    updatedAt: "2024-03-26",
    starred: false,
    content: `# Marketplace Index
This note serves as the index for marketplace plugin metadata cached locally.
## Installed Plugins
See Settings → Plugins for the full list.
## Plugin Categories
- **Productivity** — Task management, Pomodoro, daily workflows
- **Visualization** — Mind maps, graph enhancements, heatmaps
- **Writing** — AI assistant, citations, natural language dates
- **Integration** — Git backup, Publish, external APIs
- **Appearance** — Themes, sliding panes, custom CSS
- **Editor** — Advanced tables, vim bindings, snippets
## API Endpoints (Simulated)
\`\`\`
GET /api/marketplace/plugins          — list all plugins
GET /api/marketplace/plugins/:id      — plugin details
POST /api/marketplace/install/:id     — install plugin
DELETE /api/marketplace/uninstall/:id — remove plugin
GET /api/marketplace/themes           — list all themes
POST /api/marketplace/themes/:id      — apply theme
\`\`\`
See [[Getting Started]] to learn about extending your vault.`,
  },
];
// ─── Sample Plugins ──────────────────────────────────────────────────────────
export const SAMPLE_PLUGINS: Plugin[] = [
  {
    id: "calendar",
    name: "Calendar",
    description: "A simple calendar widget for navigating daily notes.",
    author: "liamcain",
    version: "1.5.10",
    enabled: true,
    official: false,
    downloads: 2100000,
    category: "productivity",
  },
  {
    id: "dataview",
    name: "Dataview",
    description: "Complex data views for your Obsidian vault using queries.",
    author: "blacksmithgu",
    version: "0.5.64",
    enabled: true,
    official: false,
    downloads: 3400000,
    category: "visualization",
  },
  {
    id: "templater",
    name: "Templater",
    description: "A template plugin with powerful JavaScript capabilities.",
    author: "SilentVoid13",
    version: "2.2.3",
    enabled: true,
    official: false,
    downloads: 2900000,
    category: "editor",
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Draw and sketch in your notes with the Excalidraw editor.",
    author: "zsviczian",
    version: "2.0.17",
    enabled: true,
    official: false,
    downloads: 1700000,
    category: "visualization",
  },
  {
    id: "kanban",
    name: "Kanban",
    description: "Create Kanban boards from your markdown notes.",
    author: "mgmeyers",
    version: "1.5.3",
    enabled: false,
    official: false,
    downloads: 1200000,
    category: "productivity",
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Global task management across your vault.",
    author: "obsidian-tasks-group",
    version: "7.4.0",
    enabled: true,
    official: false,
    downloads: 2400000,
    category: "productivity",
  },
  {
    id: "tag-wrangler",
    name: "Tag Wrangler",
    description: "Rename, merge, toggle, and search tags.",
    author: "pjeby",
    version: "0.6.1",
    enabled: false,
    official: false,
    downloads: 890000,
    category: "editor",
  },
  {
    id: "quick-switcher",
    name: "Quick Switcher++",
    description: "Enhanced quick switcher with heading and symbol search.",
    author: "darlal-switcher-plus",
    version: "4.6.0",
    enabled: true,
    official: false,
    downloads: 1100000,
    category: "productivity",
  },
];
// ─── Utilities ────────────────────────────────────────────────────────────────
export function extractWikilinks(content: string): string[] {
  const regex = /!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    const normalizedTarget = rawTarget.split("#")[0].split("^")[0].trim();
    if (normalizedTarget) {
      links.push(normalizedTarget);
    }
  }
  return [...new Set(links)];
}
export function getNoteByTitle(notes: Note[], title: string): Note | undefined {
  return notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
}
export function getBacklinks(notes: Note[], targetNote: Note): Note[] {
  return notes.filter((note) => {
    if (note.id === targetNote.id) return false;
    const links = extractWikilinks(note.content);
    return links.some(
      (link) => link.toLowerCase() === targetNote.title.toLowerCase()
    );
  });
}
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
export function getAllTags(notes: Note[]): { tag: string; count: number }[] {
  const tagCounts: Record<string, number> = {};
  notes.forEach((note) => {
    const tags = Array.isArray(note.tags) ? note.tags : [];
    tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
export function applyTheme(theme: ObsidianTheme): void {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Regenerate derived tokens
  const accent = theme.vars["--obs-accent"] ?? "#7c6af7";
  root.style.setProperty("--primary", accent);
  root.style.setProperty("--ring", accent);
  root.style.setProperty("--color-obsidian-accent", accent);
  root.style.setProperty("--color-obsidian-bg", theme.vars["--obs-bg"] ?? "#1e1e2e");
  root.style.setProperty("--background", theme.vars["--obs-bg"] ?? "#1e1e2e");
  root.style.setProperty("--color-obsidian-surface", theme.vars["--obs-surface"] ?? "#252535");
  root.style.setProperty("--color-obsidian-surface-2", theme.vars["--obs-surface-2"] ?? "#2a2a3d");
  root.style.setProperty("--color-obsidian-border", theme.vars["--obs-border"] ?? "#353550");
  root.style.setProperty("--color-obsidian-text", theme.vars["--obs-text"] ?? "#cdd6f4");
  root.style.setProperty("--foreground", theme.vars["--obs-text"] ?? "#cdd6f4");
  root.style.setProperty("--color-obsidian-muted-text", theme.vars["--obs-muted"] ?? "#6c7086");
  root.style.setProperty("--color-obsidian-accent-soft", theme.vars["--obs-accent-soft"] ?? "#a78bfa");
  root.style.setProperty("--color-obsidian-link", theme.vars["--obs-link"] ?? "#89b4fa");
  root.style.setProperty("--color-obsidian-tag", theme.vars["--obs-tag"] ?? "#cba6f7");
}
// ─── Custom Theme System ─────────────────────────────────────────────────────
export interface CustomThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  link: string;
  tag: string;
  codeBackground: string;
  codeText: string;
}
export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: "#1e1e2e",
  surface: "#252535",
  border: "#353550",
  text: "#cdd6f4",
  muted: "#6c7086",
  accent: "#7c6af7",
  accentSoft: "#a78bfa",
  link: "#89b4fa",
  tag: "#cba6f7",
  codeBackground: "#181825",
  codeText: "#a6e3a1",
};
export const COLOR_PALETTES = {
  backgrounds: [
    "#1e1e2e", "#181825", "#0d1117", "#1a1b26", "#2e3440",
    "#282a36", "#282828", "#002b36", "#f5f0e8", "#ffffff",
  ],
  surfaces: [
    "#252535", "#1e1e2e", "#161b22", "#16161e", "#3b4252",
    "#21222c", "#32302f", "#073642", "#ede8de", "#f8f8f8",
  ],
  borders: [
    "#353550", "#313244", "#30363d", "#292e42", "#4c566a",
    "#44475a", "#504945", "#1a4a55", "#d0cab8", "#e0e0e0",
  ],
  texts: [
    "#cdd6f4", "#f8f8f2", "#c9d1d9", "#c0caf5", "#eceff4",
    "#f8f8f2", "#ebdbb2", "#839496", "#2c2c2c", "#1a1a1a",
  ],
  accents: [
    "#7c6af7", "#cba6f7", "#58a6ff", "#7aa2f7", "#88c0d0",
    "#bd93f9", "#d79921", "#268bd2", "#5a7a9f", "#6366f1",
    "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#14b8a6",
  ],
  links: [
    "#89b4fa", "#7dcfff", "#58a6ff", "#7aa2f7", "#5e81ac",
    "#8be9fd", "#83a598", "#6c71c4", "#2d6ea0", "#3b82f6",
  ],
  tags: [
    "#cba6f7", "#f38ba8", "#a6e3a1", "#f9e2af", "#a3be8c",
    "#50fa7b", "#b8bb26", "#cb4b16", "#8b4a8b", "#f472b6",
  ],
};
export function applyCustomColors(colors: CustomThemeColors): void {
  const root = document.documentElement;
  // Apply all custom colors as CSS variables
  root.style.setProperty("--obs-bg", colors.background);
  root.style.setProperty("--obs-surface", colors.surface);
  root.style.setProperty("--obs-surface-2", colors.surface);
  root.style.setProperty("--obs-border", colors.border);
  root.style.setProperty("--obs-text", colors.text);
  root.style.setProperty("--obs-muted", colors.muted);
  root.style.setProperty("--obs-accent", colors.accent);
  root.style.setProperty("--obs-accent-soft", colors.accentSoft);
  root.style.setProperty("--obs-link", colors.link);
  root.style.setProperty("--obs-tag", colors.tag);
  root.style.setProperty("--obs-code-bg", colors.codeBackground);
  root.style.setProperty("--obs-code-text", colors.codeText);
  // Regenerate derived tokens
  root.style.setProperty("--primary", colors.accent);
  root.style.setProperty("--ring", colors.accent);
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.text);
  root.style.setProperty("--color-obsidian-bg", colors.background);
  root.style.setProperty("--color-obsidian-surface", colors.surface);
  root.style.setProperty("--color-obsidian-surface-2", colors.surface);
  root.style.setProperty("--color-obsidian-border", colors.border);
  root.style.setProperty("--color-obsidian-text", colors.text);
  root.style.setProperty("--color-obsidian-muted-text", colors.muted);
  root.style.setProperty("--color-obsidian-accent", colors.accent);
  root.style.setProperty("--color-obsidian-accent-soft", colors.accentSoft);
  root.style.setProperty("--color-obsidian-link", colors.link);
  root.style.setProperty("--color-obsidian-tag", colors.tag);
  root.style.setProperty("--color-obsidian-code-bg", colors.codeBackground);
  root.style.setProperty("--color-obsidian-code-text", colors.codeText);
}
export function getColorsFromTheme(theme: ObsidianTheme): CustomThemeColors {
  return {
    background: theme.vars["--obs-bg"] ?? DEFAULT_CUSTOM_COLORS.background,
    surface: theme.vars["--obs-surface"] ?? DEFAULT_CUSTOM_COLORS.surface,
    border: theme.vars["--obs-border"] ?? DEFAULT_CUSTOM_COLORS.border,
    text: theme.vars["--obs-text"] ?? DEFAULT_CUSTOM_COLORS.text,
    muted: theme.vars["--obs-muted"] ?? DEFAULT_CUSTOM_COLORS.muted,
    accent: theme.vars["--obs-accent"] ?? DEFAULT_CUSTOM_COLORS.accent,
    accentSoft: theme.vars["--obs-accent-soft"] ?? DEFAULT_CUSTOM_COLORS.accentSoft,
    link: theme.vars["--obs-link"] ?? DEFAULT_CUSTOM_COLORS.link,
    tag: theme.vars["--obs-tag"] ?? DEFAULT_CUSTOM_COLORS.tag,
    codeBackground: theme.vars["--obs-code-bg"] ?? DEFAULT_CUSTOM_COLORS.codeBackground,
    codeText: theme.vars["--obs-code-text"] ?? DEFAULT_CUSTOM_COLORS.codeText,
  };
}
export function formatDownloads(n?: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toString();
}
