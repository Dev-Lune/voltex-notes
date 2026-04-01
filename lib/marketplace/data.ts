/**
 * Marketplace Static Data
 * 
 * This file contains sample data for the marketplace. In production,
 * this would be fetched from a backend API or database.
 */

import type {
  PluginManifest,
  ThemeManifest,
  CSSSnippet,
  PluginAuthor,
} from "./types";

// ─── Sample Authors ───────────────────────────────────────────────────────────

export const SAMPLE_AUTHORS: Record<string, PluginAuthor> = {
  "obsidian-cloud": {
    id: "obsidian-cloud",
    name: "Obsidian Cloud",
    email: "team@obsidian.cloud",
    url: "https://obsidian.cloud",
    verified: true,
  },
  sidharth: {
    id: "sidharth",
    name: "Sidharth",
    url: "https://github.com/sidharth",
    verified: true,
  },
  tgrosinger: {
    id: "tgrosinger",
    name: "Tony Grosinger",
    url: "https://github.com/tgrosinger",
    verified: true,
  },
  vinzent03: {
    id: "vinzent03",
    name: "Vinzent",
    url: "https://github.com/Vinzent03",
    verified: true,
  },
  mgmeyers: {
    id: "mgmeyers",
    name: "Matthew Meyers",
    url: "https://github.com/mgmeyers",
    verified: true,
  },
  catppuccin: {
    id: "catppuccin",
    name: "Catppuccin",
    url: "https://github.com/catppuccin",
    verified: true,
  },
  dracula: {
    id: "dracula",
    name: "Dracula Theme",
    url: "https://draculatheme.com",
    verified: true,
  },
};

// ─── Sample Plugins ───────────────────────────────────────────────────────────

export const SAMPLE_PLUGINS: PluginManifest[] = [
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Full-featured drawing and diagramming canvas built into your vault. Create hand-drawn style diagrams, wireframes, and sketches.",
    longDescription: `Excalidraw brings a powerful whiteboard-style drawing canvas directly into your notes:

- **Shape tools** — Rectangle, ellipse, triangle, diamond, sticky notes
- **Drawing tools** — Freehand pencil, arrows, lines
- **Text** — Add labels and annotations anywhere
- **Styling** — 12-color palette, stroke width, fill options
- **Canvas controls** — Infinite pan/zoom, grid snap, lock mode
- **History** — Full undo/redo with Ctrl+Z/Y
- **Export** — Save drawings as PNG images
- **Theme-aware** — Adapts to your vault’s light or dark theme
- **Persistence** — Drawings auto-save as JSON in your note data

Create a Drawing note from the new-note menu and start sketching instantly.`,
    author: SAMPLE_AUTHORS.sidharth,
    version: "1.0.0",
    versions: [
      {
        version: "1.0.0",
        releaseDate: "2026-03-28",
        changelog: "Initial release — shapes, freehand, text, arrows, export, theme support",
        minAppVersion: "1.0.0",
        downloadUrl: "/plugins/excalidraw/1.0.0.zip",
        checksum: "exc100",
      },
    ],
    category: "visualization",
    tags: ["drawing", "excalidraw", "whiteboard", "diagrams", "canvas", "sketch"],
    license: "MIT",
    repository: "https://github.com/sidharth/obsidian-excalidraw",
    stats: {
      downloads: 3200000,
      activeInstalls: 1400000,
      stars: 6100,
      reviews: 520,
      averageRating: 4.9,
    },
    icon: "✏️",
    screenshots: [],
    price: "free",
    createdAt: "2026-01-10",
    updatedAt: "2026-03-28",
  },
  {
    id: "advanced-tables",
    name: "Advanced Tables",
    description: "Improved table navigation, formatting, and spreadsheet-like formulas.",
    longDescription: `Advanced Tables adds powerful table editing capabilities to Obsidian:
    
- Auto-format tables as you type
- Tab/Enter navigation between cells
- Spreadsheet-style formulas
- Sort tables by column
- Export tables to CSV
- Add/remove rows and columns with hotkeys`,
    author: SAMPLE_AUTHORS.tgrosinger,
    version: "0.22.1",
    versions: [
      {
        version: "0.22.1",
        releaseDate: "2024-03-15",
        changelog: "Fixed cell navigation in edit mode",
        minAppVersion: "1.0.0",
        downloadUrl: "/plugins/advanced-tables/0.22.1.zip",
        checksum: "abc123",
      },
    ],
    category: "editor",
    tags: ["tables", "editor", "formatting", "spreadsheet"],
    license: "MIT",
    repository: "https://github.com/tgrosinger/advanced-tables-obsidian",
    stats: {
      downloads: 2100000,
      activeInstalls: 890000,
      stars: 4800,
      reviews: 342,
      averageRating: 4.8,
    },
    icon: "T",
    screenshots: [],
    price: "free",
    createdAt: "2020-10-15",
    updatedAt: "2024-03-15",
  },
  {
    id: "obsidian-git",
    name: "Obsidian Git",
    description: "Backup your vault to a remote Git repository on a schedule.",
    longDescription: `Obsidian Git enables automatic Git backups:

- Push/pull on open
- Automatic periodic commits
- Commit staging area
- Branch management
- Conflict resolution
- GitHub integration`,
    author: SAMPLE_AUTHORS.vinzent03,
    version: "2.26.0",
    versions: [
      {
        version: "2.26.0",
        releaseDate: "2024-03-10",
        changelog: "Added support for GitHub authentication",
        minAppVersion: "1.0.0",
        downloadUrl: "/plugins/obsidian-git/2.26.0.zip",
        checksum: "def456",
      },
    ],
    category: "integration",
    tags: ["git", "backup", "version-control", "github"],
    license: "MIT",
    repository: "https://github.com/Vinzent03/obsidian-git",
    stats: {
      downloads: 1800000,
      activeInstalls: 720000,
      stars: 5900,
      reviews: 456,
      averageRating: 4.7,
    },
    icon: "G",
    screenshots: [],
    price: "free",
    createdAt: "2020-11-20",
    updatedAt: "2024-03-10",
  },
  {
    id: "obsidian-kanban",
    name: "Kanban Board",
    description: "Create Kanban-style boards from your markdown notes.",
    longDescription: `Transform your notes into visual Kanban boards:

- Drag and drop cards between columns
- Create cards from templates
- Link cards to notes
- Due dates and tags
- Archive completed cards
- Multiple board views`,
    author: SAMPLE_AUTHORS.mgmeyers,
    version: "1.5.3",
    versions: [
      {
        version: "1.5.3",
        releaseDate: "2024-02-28",
        changelog: "Performance improvements for large boards",
        minAppVersion: "1.0.0",
        downloadUrl: "/plugins/obsidian-kanban/1.5.3.zip",
        checksum: "ghi789",
      },
    ],
    category: "productivity",
    tags: ["kanban", "tasks", "productivity", "boards"],
    license: "MIT",
    repository: "https://github.com/mgmeyers/obsidian-kanban",
    stats: {
      downloads: 1200000,
      activeInstalls: 480000,
      stars: 3700,
      reviews: 289,
      averageRating: 4.6,
    },
    icon: "K",
    screenshots: [],
    price: "free",
    createdAt: "2021-02-15",
    updatedAt: "2024-02-28",
  },
];

// ─── Sample Themes ────────────────────────────────────────────────────────────

export const SAMPLE_THEMES: ThemeManifest[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    description: "Soothing pastel dark theme inspired by Catppuccin.",
    author: SAMPLE_AUTHORS.catppuccin,
    version: "1.0.0",
    colorScheme: "dark",
    colors: {
      dark: {
        background: "#1e1e2e",
        surface: "#181825",
        border: "#313244",
        text: "#cdd6f4",
        muted: "#6c7086",
        accent: "#cba6f7",
        accentSoft: "#d9b4fe",
        link: "#89b4fa",
        tag: "#f38ba8",
        codeBackground: "#11111b",
        codeText: "#a6e3a1",
      },
    },
    cssVariables: {
      "--obs-bg": "#181825",
      "--obs-surface": "#1e1e2e",
      "--obs-accent": "#cba6f7",
    },
    screenshots: [],
    stats: {
      downloads: 520000,
      activeInstalls: 210000,
      stars: 3200,
      reviews: 178,
      averageRating: 4.9,
    },
    price: "free",
    createdAt: "2022-01-10",
    updatedAt: "2024-01-15",
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "A dark theme with vibrant accents and high contrast.",
    author: SAMPLE_AUTHORS.dracula,
    version: "1.2.0",
    colorScheme: "dark",
    colors: {
      dark: {
        background: "#282a36",
        surface: "#21222c",
        border: "#44475a",
        text: "#f8f8f2",
        muted: "#6272a4",
        accent: "#bd93f9",
        accentSoft: "#ff79c6",
        link: "#8be9fd",
        tag: "#50fa7b",
        codeBackground: "#1e1f29",
        codeText: "#50fa7b",
      },
    },
    cssVariables: {
      "--obs-bg": "#282a36",
      "--obs-surface": "#21222c",
      "--obs-accent": "#bd93f9",
    },
    screenshots: [],
    stats: {
      downloads: 480000,
      activeInstalls: 195000,
      stars: 2800,
      reviews: 156,
      averageRating: 4.8,
    },
    price: "free",
    createdAt: "2021-06-20",
    updatedAt: "2024-02-20",
  },
];

// ─── Sample CSS Snippets ──────────────────────────────────────────────────────

export const SAMPLE_SNIPPETS: CSSSnippet[] = [
  {
    id: "hide-scrollbar",
    name: "Hide Scrollbar",
    description: "Hides the scrollbar for a cleaner look.",
    author: SAMPLE_AUTHORS["obsidian-cloud"],
    css: `::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none;
}`,
    tags: ["ui", "minimal", "scrollbar"],
    stats: {
      downloads: 45000,
      activeInstalls: 18000,
      stars: 120,
      reviews: 23,
      averageRating: 4.5,
    },
    createdAt: "2023-05-10",
    updatedAt: "2023-05-10",
  },
  {
    id: "rainbow-tags",
    name: "Rainbow Tags",
    description: "Colorful tags based on content.",
    author: SAMPLE_AUTHORS["obsidian-cloud"],
    css: `.tag[href="#important"] { background: #f38ba8; color: white; }
.tag[href="#todo"] { background: #f9e2af; color: #1e1e2e; }
.tag[href="#done"] { background: #a6e3a1; color: #1e1e2e; }
.tag[href="#idea"] { background: #89b4fa; color: white; }`,
    tags: ["tags", "colors", "customization"],
    stats: {
      downloads: 32000,
      activeInstalls: 14000,
      stars: 95,
      reviews: 18,
      averageRating: 4.6,
    },
    createdAt: "2023-08-15",
    updatedAt: "2023-08-15",
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getPluginById(id: string): PluginManifest | undefined {
  return SAMPLE_PLUGINS.find((p) => p.id === id);
}

export function getThemeById(id: string): ThemeManifest | undefined {
  return SAMPLE_THEMES.find((t) => t.id === id);
}

export function getSnippetById(id: string): CSSSnippet | undefined {
  return SAMPLE_SNIPPETS.find((s) => s.id === id);
}

export function searchPlugins(query: string): PluginManifest[] {
  const q = query.toLowerCase();
  return SAMPLE_PLUGINS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function getPluginsByCategory(category: string): PluginManifest[] {
  return SAMPLE_PLUGINS.filter((p) => p.category === category);
}

export function getPopularPlugins(limit = 10): PluginManifest[] {
  return [...SAMPLE_PLUGINS]
    .sort((a, b) => b.stats.downloads - a.stats.downloads)
    .slice(0, limit);
}

export function getNewestPlugins(limit = 10): PluginManifest[] {
  return [...SAMPLE_PLUGINS]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
