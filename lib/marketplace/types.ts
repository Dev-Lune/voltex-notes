/**
 * Marketplace API Types
 * 
 * This file defines the core types used by the Obsidian Cloud marketplace
 * for plugins, themes, and snippets.
 */

// ─── Plugin Types ─────────────────────────────────────────────────────────────

export type PluginCategory =
  | "productivity"
  | "visualization"
  | "writing"
  | "integration"
  | "appearance"
  | "editor"
  | "themes"
  | "snippets";

export interface PluginAuthor {
  id: string;
  name: string;
  email?: string;
  url?: string;
  avatar?: string;
  verified: boolean;
}

export interface PluginVersion {
  version: string;
  releaseDate: string;
  changelog: string;
  minAppVersion: string;
  downloadUrl: string;
  checksum: string;
}

export interface PluginStats {
  downloads: number;
  activeInstalls: number;
  stars: number;
  reviews: number;
  averageRating: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  author: PluginAuthor;
  version: string;
  versions: PluginVersion[];
  category: PluginCategory;
  tags: string[];
  license: string;
  repository?: string;
  homepage?: string;
  funding?: string;
  stats: PluginStats;
  icon?: string;
  screenshots?: string[];
  price: "free" | "paid";
  priceAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Theme Types ──────────────────────────────────────────────────────────────

export interface ThemeColorScheme {
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

export interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  author: PluginAuthor;
  version: string;
  colorScheme: "dark" | "light" | "both";
  colors: {
    dark?: ThemeColorScheme;
    light?: ThemeColorScheme;
  };
  cssVariables: Record<string, string>;
  screenshots: string[];
  stats: PluginStats;
  price: "free" | "paid";
  createdAt: string;
  updatedAt: string;
}

// ─── Snippet Types ────────────────────────────────────────────────────────────

export interface CSSSnippet {
  id: string;
  name: string;
  description: string;
  author: PluginAuthor;
  css: string;
  tags: string[];
  stats: PluginStats;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface MarketplaceSearchParams {
  query?: string;
  category?: PluginCategory;
  tags?: string[];
  sort?: "popular" | "newest" | "rating" | "downloads";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  price?: "free" | "paid" | "all";
}

export interface MarketplaceSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MarketplaceAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Installation Types ───────────────────────────────────────────────────────

export interface InstalledPlugin {
  id: string;
  version: string;
  installedAt: string;
  updatedAt: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface InstalledTheme {
  id: string;
  version: string;
  installedAt: string;
  active: boolean;
}

export interface UserMarketplaceData {
  installedPlugins: InstalledPlugin[];
  installedThemes: InstalledTheme[];
  enabledSnippets: string[];
  purchases: string[];
}
