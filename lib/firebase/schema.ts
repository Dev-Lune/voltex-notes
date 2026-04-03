/**
 * Firestore Database Schema
 * 
 * This file defines the complete data structure for the Obsidian Cloud application.
 * It includes TypeScript interfaces for all collections, subcollections, and documents,
 * along with Firestore security rules examples and indexing requirements.
 * 
 * Collection Structure:
 * 
 * /users/{userId}
 *   - User profile and authentication data
 *   - /notes/{noteId} - User's notes
 *   - /folders/{folderId} - Folder hierarchy
 *   - /settings/{settingId} - User preferences
 *   - /plugins/{pluginId} - Installed plugins
 *   - /themes/{themeId} - Custom themes
 *   - /sync/{syncId} - Sync metadata
 * 
 * /shared/{shareId}
 *   - Publicly shared notes
 * 
 * /marketplace
 *   - /plugins/{pluginId} - Community plugins
 *   - /themes/{themeId} - Community themes
 */

import { Timestamp, FieldValue } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════════════════════
// USER DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main user document stored at /users/{userId}
 * Contains profile information and account metadata.
 */
export interface FirestoreUser {
  // ─── Identity ───────────────────────────────────────────────────────────────
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  
  // ─── Authentication ─────────────────────────────────────────────────────────
  /** Authentication provider: 'google', 'github', 'email', 'anonymous' */
  authProvider: "google" | "github" | "email" | "anonymous";
  emailVerified: boolean;
  
  // ─── Account Status ─────────────────────────────────────────────────────────
  /** Account tier: 'free', 'pro', 'team' */
  tier: "free" | "pro" | "team";
  storageUsed: number; // bytes
  storageLimit: number; // bytes (free: 100MB, pro: 10GB, team: 100GB)
  noteCount: number;
  
  // ─── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  lastSyncAt: Timestamp | null;
  
  // ─── Preferences Reference ──────────────────────────────────────────────────
  /** Default vault ID for this user */
  defaultVaultId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Note document stored at /users/{userId}/notes/{noteId}
 */
export interface FirestoreNote {
  // ─── Identity ───────────────────────────────────────────────────────────────
  id: string;
  title: string;
  
  // ─── Content ────────────────────────────────────────────────────────────────
  /** Markdown content of the note */
  content: string;
  /** Content size in bytes (for storage tracking) */
  contentSize: number;
  /** Extracted plain text for search (first 10000 chars) */
  searchText: string;
  
  // ─── Type ───────────────────────────────────────────────────────────────────
  /** Note type: 'markdown', 'drawing', 'daily', 'kanban', 'canvas' */
  type: "markdown" | "drawing" | "daily" | "kanban" | "canvas";
  
  // ─── Organization ───────────────────────────────────────────────────────────
  folderId: string; // 'root' for top-level
  folderPath: string; // e.g., 'projects/work' for nested navigation
  tags: string[];
  aliases: string[]; // Alternative names for the note
  
  // ─── Links ──────────────────────────────────────────────────────────────────
  /** Outgoing wikilinks extracted from content */
  outgoingLinks: string[];
  /** Note IDs that link to this note (computed) */
  backlinks: string[];
  
  // ─── State ──────────────────────────────────────────────────────────────────
  starred: boolean;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt: Timestamp | null;
  
  // ─── Metadata ───────────────────────────────────────────────────────────────
  /** YAML frontmatter parsed as key-value pairs */
  frontmatter: Record<string, unknown>;
  wordCount: number;
  characterCount: number;
  readingTime: number; // minutes
  
  // ─── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastViewedAt: Timestamp | null;
  
  // ─── Sync ───────────────────────────────────────────────────────────────────
  /** Version number for conflict resolution */
  version: number;
  /** Hash of content for change detection */
  contentHash: string;
  /** Device ID that last modified this note */
  lastModifiedBy: string;
  
  // ─── Sharing ────────────────────────────────────────────────────────────────
  isShared: boolean;
  shareId: string | null;
  sharePermission: "view" | "edit" | null;
}

/**
 * Drawing-specific data stored alongside the note
 */
export interface FirestoreDrawingData {
  noteId: string;
  /** Excalidraw JSON data */
  elements: unknown[];
  appState: Record<string, unknown>;
  /** Exported PNG thumbnail URL */
  thumbnailURL: string | null;
}

/**
 * Kanban-specific data stored alongside the note
 */
export interface FirestoreKanbanData {
  noteId: string;
  columns: Array<{
    id: string;
    title: string;
    cardIds: string[];
  }>;
  cards: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: Timestamp | null;
    labels: string[];
    completed: boolean;
  }>;
}

/**
 * Canvas-specific data stored alongside the note
 */
export interface FirestoreCanvasData {
  noteId: string;
  nodes: Array<{
    id: string;
    type: "note" | "text" | "group" | "link" | "file";
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    color: string;
    linkedNoteId?: string;
  }>;
  edges: Array<{
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: "top" | "right" | "bottom" | "left";
    toSide: "top" | "right" | "bottom" | "left";
    color: string;
    label?: string;
  }>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLDERS COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Folder document stored at /users/{userId}/folders/{folderId}
 */
export interface FirestoreFolder {
  id: string;
  name: string;
  parentId: string | null; // null for root-level folders
  path: string; // Full path like 'projects/work/meetings'
  color: string | null;
  icon: string | null;
  collapsed: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER SETTINGS COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Settings document stored at /users/{userId}/settings/preferences
 */
export interface FirestoreUserSettings {
  // ─── Editor ─────────────────────────────────────────────────────────────────
  editor: {
    defaultViewMode: "live" | "editor" | "preview";
    fontFamily: string;
    fontSize: number; // px
    lineHeight: number;
    tabSize: number;
    useSpaces: boolean;
    wordWrap: boolean;
    lineNumbers: boolean;
    vimMode: boolean;
    spellcheck: boolean;
    autosaveInterval: number; // milliseconds
    showFrontmatter: boolean;
  };
  
  // ─── Appearance ─────────────────────────────────────────────────────────────
  appearance: {
    themeId: string;
    customCSS: string;
    accentColor: string;
    interfaceScale: number; // 0.8 - 1.2
    reducedMotion: boolean;
    translucency: boolean;
  };
  
  // ─── Sidebar ────────────────────────────────────────────────────────────────
  sidebar: {
    collapsed: boolean;
    width: number;
    showFileExtensions: boolean;
    sortBy: "name" | "modified" | "created";
    sortOrder: "asc" | "desc";
    showHiddenFiles: boolean;
  };
  
  // ─── Graph ──────────────────────────────────────────────────────────────────
  graph: {
    showOrphans: boolean;
    showAttachments: boolean;
    nodeSize: number;
    linkDistance: number;
    repelForce: number;
    centerForce: number;
    colorGroups: Record<string, string>; // tag -> color
  };
  
  // ─── Daily Notes ────────────────────────────────────────────────────────────
  dailyNotes: {
    enabled: boolean;
    folder: string;
    dateFormat: string;
    template: string | null;
    openOnStartup: boolean;
  };
  
  // ─── Sync ───────────────────────────────────────────────────────────────────
  sync: {
    enabled: boolean;
    autoSync: boolean;
    syncInterval: number; // milliseconds
    conflictResolution: "local" | "remote" | "manual";
    syncOnStartup: boolean;
    syncOnClose: boolean;
    excludeFolders: string[];
    excludeTags: string[];
  };
  
  // ─── Hotkeys ────────────────────────────────────────────────────────────────
  hotkeys: Record<string, string>; // command -> keybinding
  
  // ─── Mobile ─────────────────────────────────────────────────────────────────
  mobile: {
    pullToRefresh: boolean;
    swipeGestures: boolean;
    hapticFeedback: boolean;
    quickActions: string[]; // note type IDs for quick create
  };
  
  // ─── Privacy ────────────────────────────────────────────────────────────────
  privacy: {
    analyticsEnabled: boolean;
    crashReportsEnabled: boolean;
    telemetryEnabled: boolean;
  };
  
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGINS COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Installed plugin document stored at /users/{userId}/plugins/{pluginId}
 */
export interface FirestoreInstalledPlugin {
  id: string;
  marketplaceId: string;
  name: string;
  version: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  installedAt: Timestamp;
  updatedAt: Timestamp;
  autoUpdate: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Custom theme document stored at /users/{userId}/themes/{themeId}
 */
export interface FirestoreCustomTheme {
  id: string;
  name: string;
  baseTheme: "dark" | "light";
  colors: {
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
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC METADATA COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sync state document stored at /users/{userId}/sync/state
 */
export interface FirestoreSyncState {
  lastSyncAt: Timestamp | null;
  lastSyncDeviceId: string | null;
  pendingChanges: number;
  conflicts: Array<{
    noteId: string;
    localVersion: number;
    remoteVersion: number;
    detectedAt: Timestamp;
    resolved: boolean;
  }>;
  devices: Array<{
    id: string;
    name: string;
    platform: "web" | "android" | "ios" | "desktop";
    lastActiveAt: Timestamp;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED NOTES COLLECTION (Public)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shared note document stored at /shared/{shareId}
 */
export interface FirestoreSharedNote {
  shareId: string;
  ownerId: string;
  noteId: string;
  title: string;
  content: string;
  permission: "view" | "edit";
  password: string | null; // hashed
  expiresAt: Timestamp | null;
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE COLLECTIONS (Global)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Community plugin document stored at /marketplace/plugins/{pluginId}
 */
export interface FirestoreMarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: {
    name: string;
    url: string | null;
    userId: string | null;
  };
  version: string;
  minAppVersion: string;
  repo: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  categories: string[];
  tags: string[];
  screenshots: string[];
  readme: string;
  changelog: string;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp;
}

/**
 * Community theme document stored at /marketplace/themes/{themeId}
 */
export interface FirestoreMarketplaceTheme {
  id: string;
  name: string;
  description: string;
  author: {
    name: string;
    url: string | null;
    userId: string | null;
  };
  version: string;
  mode: "dark" | "light" | "both";
  colors: Record<string, string>;
  screenshots: string[];
  downloads: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type NoteType = FirestoreNote["type"];
export type AuthProvider = FirestoreUser["authProvider"];
export type Tier = FirestoreUser["tier"];
export type SharePermission = FirestoreSharedNote["permission"];
export type ThemeMode = FirestoreMarketplaceTheme["mode"];
export type Platform = FirestoreSyncState["devices"][0]["platform"];

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE SECURITY RULES (Documentation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recommended Firestore Security Rules:
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     
 *     // Users can only access their own data
 *     match /users/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *       
 *       match /notes/{noteId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       match /folders/{folderId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       match /settings/{settingId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       match /plugins/{pluginId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       match /themes/{themeId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       match /sync/{syncId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *     }
 *     
 *     // Shared notes are publicly readable with valid shareId
 *     match /shared/{shareId} {
 *       allow read: if true;
 *       allow write: if request.auth != null && 
 *                      request.resource.data.ownerId == request.auth.uid;
 *     }
 *     
 *     // Marketplace is readable by all, writable by admins
 *     match /marketplace/{collection}/{docId} {
 *       allow read: if true;
 *       allow write: if request.auth != null && 
 *                      exists(/databases/$(database)/documents/admins/$(request.auth.uid));
 *     }
 *   }
 * }
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE INDEXES (Documentation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Required Composite Indexes:
 * 
 * Collection: users/{userId}/notes
 * - folderId ASC, updatedAt DESC
 * - type ASC, updatedAt DESC
 * - starred ASC, updatedAt DESC
 * - trashed ASC, trashedAt DESC
 * - tags ARRAY_CONTAINS, updatedAt DESC
 * 
 * Collection: marketplace/plugins
 * - categories ARRAY_CONTAINS, downloads DESC
 * - isFeatured ASC, downloads DESC
 * 
 * Collection: marketplace/themes
 * - mode ASC, downloads DESC
 * - isFeatured ASC, downloads DESC
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_USER_SETTINGS: Omit<FirestoreUserSettings, "updatedAt"> = {
  editor: {
    defaultViewMode: "live",
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 1.6,
    tabSize: 2,
    useSpaces: true,
    wordWrap: true,
    lineNumbers: false,
    vimMode: false,
    spellcheck: true,
    autosaveInterval: 2000,
    showFrontmatter: false,
  },
  appearance: {
    themeId: "obsidian-default",
    customCSS: "",
    accentColor: "#7c6af7",
    interfaceScale: 1,
    reducedMotion: false,
    translucency: true,
  },
  sidebar: {
    collapsed: false,
    width: 264,
    showFileExtensions: false,
    sortBy: "modified",
    sortOrder: "desc",
    showHiddenFiles: false,
  },
  graph: {
    showOrphans: true,
    showAttachments: false,
    nodeSize: 6,
    linkDistance: 120,
    repelForce: 800,
    centerForce: 0.2,
    colorGroups: {},
  },
  dailyNotes: {
    enabled: true,
    folder: "daily",
    dateFormat: "YYYY-MM-DD",
    template: null,
    openOnStartup: false,
  },
  sync: {
    enabled: true,
    autoSync: true,
    syncInterval: 30000,
    conflictResolution: "manual",
    syncOnStartup: true,
    syncOnClose: true,
    excludeFolders: [],
    excludeTags: [],
  },
  hotkeys: {
    "command-palette": "ctrl+p",
    "new-note": "ctrl+n",
    "toggle-edit-mode": "ctrl+e",
    "open-graph": "ctrl+g",
    "toggle-sidebar": "ctrl+b",
    "find-in-note": "ctrl+f",
    "quick-switcher": "ctrl+o",
    "toggle-preview": "ctrl+shift+e",
  },
  mobile: {
    pullToRefresh: true,
    swipeGestures: true,
    hapticFeedback: true,
    quickActions: ["markdown", "daily", "drawing"],
  },
  privacy: {
    analyticsEnabled: false,
    crashReportsEnabled: true,
    telemetryEnabled: false,
  },
};

export const FREE_TIER_LIMITS = {
  storageLimit: 100 * 1024 * 1024, // 100 MB
  maxNotes: 500,
  maxAttachmentSize: 5 * 1024 * 1024, // 5 MB
  syncEnabled: true,
  sharingEnabled: false,
  pluginsEnabled: true,
  maxPlugins: 5,
};

export const PRO_TIER_LIMITS = {
  storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
  maxNotes: -1, // unlimited
  maxAttachmentSize: 50 * 1024 * 1024, // 50 MB
  syncEnabled: true,
  sharingEnabled: true,
  pluginsEnabled: true,
  maxPlugins: -1, // unlimited
};
