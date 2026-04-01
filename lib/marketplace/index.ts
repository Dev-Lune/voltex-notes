/**
 * Marketplace Module Exports
 * 
 * Central export file for marketplace types and data.
 */

// Types
export type {
  PluginCategory,
  PluginAuthor,
  PluginVersion,
  PluginStats,
  PluginManifest,
  ThemeColorScheme,
  ThemeManifest,
  CSSSnippet,
  MarketplaceSearchParams,
  MarketplaceSearchResult,
  MarketplaceAPIResponse,
  InstalledPlugin,
  InstalledTheme,
  UserMarketplaceData,
} from "./types";

// Data & Helpers
export {
  SAMPLE_AUTHORS,
  SAMPLE_PLUGINS,
  SAMPLE_THEMES,
  SAMPLE_SNIPPETS,
  getPluginById,
  getThemeById,
  getSnippetById,
  searchPlugins,
  getPluginsByCategory,
  getPopularPlugins,
  getNewestPlugins,
} from "./data";
