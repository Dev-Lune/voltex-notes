/**
 * Local Storage Fallback Service
 * 
 * Provides persistent local storage for users who choose not to log in.
 * Uses IndexedDB for larger storage capacity and better performance,
 * with localStorage as a fallback for older browsers.
 * 
 * Features:
 * - IndexedDB primary storage (up to ~50% of available disk space)
 * - localStorage fallback for older browsers
 * - Automatic migration from localStorage to IndexedDB
 * - Export/Import functionality
 * - Sync with Firestore when user logs in
 */

import type { Note, Folder } from "@/components/obsidian/data";
import type { FirestoreUserSettings, FirestoreNote, FirestoreFolder } from "./schema";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LocalStorageData {
  notes: Note[];
  folders: Folder[];
  settings: Partial<FirestoreUserSettings>;
  lastModified: string;
  version: number;
  deviceId: string;
}

export interface StorageStats {
  notesCount: number;
  foldersCount: number;
  totalSize: number; // bytes
  lastModified: Date | null;
  storageType: "indexeddb" | "localstorage";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = "obsidian-cloud-local";
const DB_VERSION = 1;
const STORE_NOTES = "notes";
const STORE_FOLDERS = "folders";
const STORE_SETTINGS = "settings";
const STORE_META = "meta";

const LOCALSTORAGE_KEY = "obsidian-cloud-data";
const DEVICE_ID_KEY = "obsidian-cloud-device-id";

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE ID
// ═══════════════════════════════════════════════════════════════════════════════

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXEDDB HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Notes store
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notesStore = db.createObjectStore(STORE_NOTES, { keyPath: "id" });
        notesStore.createIndex("folder", "folder", { unique: false });
        notesStore.createIndex("type", "type", { unique: false });
        notesStore.createIndex("starred", "starred", { unique: false });
        notesStore.createIndex("updatedAt", "updatedAt", { unique: false });
        notesStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
      }

      // Folders store
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const foldersStore = db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
        foldersStore.createIndex("parentId", "parentId", { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }

      // Meta store
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
  });
}

async function getFromStore<T>(storeName: string, key?: string): Promise<T | T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    const request = key ? store.get(key) : store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function putToStore<T>(storeName: string, data: T | T[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    if (Array.isArray(data)) {
      data.forEach((item) => store.put(item));
    } else {
      store.put(data);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function saveToLocalStorage(data: LocalStorageData): void {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    // Storage quota exceeded - try to remove old data
    const existingData = loadFromLocalStorage();
    if (existingData && existingData.notes.length > 100) {
      // Keep only the most recent 100 notes
      existingData.notes = existingData.notes
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 100);
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(existingData));
    }
  }
}

function loadFromLocalStorage(): LocalStorageData | null {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class LocalStorageService {
  private useIndexedDB: boolean = true;
  private deviceId: string;
  private listeners: Array<(data: LocalStorageData) => void> = [];
  private initialized: boolean = false;

  constructor() {
    this.deviceId = getOrCreateDeviceId();
    this.checkIndexedDBSupport();
  }

  private async checkIndexedDBSupport(): Promise<void> {
    if (typeof window === "undefined") {
      this.useIndexedDB = false;
      return;
    }

    try {
      await openDatabase();
      this.useIndexedDB = true;
    } catch {
      console.log("IndexedDB not available, using localStorage fallback");
      this.useIndexedDB = false;
    }
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.checkIndexedDBSupport();

    // Migrate from localStorage to IndexedDB if needed
    if (this.useIndexedDB) {
      await this.migrateFromLocalStorage();
    }

    this.initialized = true;
  }

  private async migrateFromLocalStorage(): Promise<void> {
    const localData = loadFromLocalStorage();
    if (!localData) return;

    // Check if IndexedDB already has data
    const existingNotes = await this.getAllNotes();
    if (existingNotes.length > 0) return;

    // Migrate data
    if (localData.notes.length > 0) {
      await putToStore(STORE_NOTES, localData.notes);
    }
    if (localData.folders.length > 0) {
      await putToStore(STORE_FOLDERS, localData.folders);
    }
    if (Object.keys(localData.settings).length > 0) {
      await putToStore(STORE_SETTINGS, { key: "user", ...localData.settings });
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(LOCALSTORAGE_KEY);
    console.log("Successfully migrated data from localStorage to IndexedDB");
  }

  // ─── Notes ──────────────────────────────────────────────────────────────────

  async getAllNotes(): Promise<Note[]> {
    if (this.useIndexedDB) {
      try {
        return await getFromStore<Note[]>(STORE_NOTES) as Note[];
      } catch {
        this.useIndexedDB = false;
      }
    }
    const data = loadFromLocalStorage();
    return data?.notes ?? [];
  }

  async getNote(id: string): Promise<Note | null> {
    if (this.useIndexedDB) {
      try {
        const note = await getFromStore<Note>(STORE_NOTES, id) as Note | undefined;
        return note ?? null;
      } catch {
        this.useIndexedDB = false;
      }
    }
    const data = loadFromLocalStorage();
    return data?.notes.find((n) => n.id === id) ?? null;
  }

  async saveNote(note: Note): Promise<void> {
    const updatedNote = {
      ...note,
      updatedAt: new Date().toISOString().split("T")[0],
    };

    if (this.useIndexedDB) {
      try {
        await putToStore(STORE_NOTES, updatedNote);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage() ?? this.createEmptyData();
    const index = data.notes.findIndex((n) => n.id === note.id);
    if (index >= 0) {
      data.notes[index] = updatedNote;
    } else {
      data.notes.push(updatedNote);
    }
    data.lastModified = new Date().toISOString();
    saveToLocalStorage(data);
    this.notifyListeners();
  }

  async deleteNote(id: string): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await deleteFromStore(STORE_NOTES, id);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage();
    if (data) {
      data.notes = data.notes.filter((n) => n.id !== id);
      data.lastModified = new Date().toISOString();
      saveToLocalStorage(data);
      this.notifyListeners();
    }
  }

  async saveNotes(notes: Note[]): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await clearStore(STORE_NOTES);
        await putToStore(STORE_NOTES, notes);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage() ?? this.createEmptyData();
    data.notes = notes;
    data.lastModified = new Date().toISOString();
    saveToLocalStorage(data);
    this.notifyListeners();
  }

  // ─── Folders ────────────────────────────────────────────────────────────────

  async getAllFolders(): Promise<Folder[]> {
    if (this.useIndexedDB) {
      try {
        return await getFromStore<Folder[]>(STORE_FOLDERS) as Folder[];
      } catch {
        this.useIndexedDB = false;
      }
    }
    const data = loadFromLocalStorage();
    return data?.folders ?? [];
  }

  async saveFolder(folder: Folder): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await putToStore(STORE_FOLDERS, folder);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage() ?? this.createEmptyData();
    const index = data.folders.findIndex((f) => f.id === folder.id);
    if (index >= 0) {
      data.folders[index] = folder;
    } else {
      data.folders.push(folder);
    }
    data.lastModified = new Date().toISOString();
    saveToLocalStorage(data);
    this.notifyListeners();
  }

  async deleteFolder(id: string): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await deleteFromStore(STORE_FOLDERS, id);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage();
    if (data) {
      data.folders = data.folders.filter((f) => f.id !== id);
      data.lastModified = new Date().toISOString();
      saveToLocalStorage(data);
      this.notifyListeners();
    }
  }

  async saveFolders(folders: Folder[]): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await clearStore(STORE_FOLDERS);
        await putToStore(STORE_FOLDERS, folders);
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage() ?? this.createEmptyData();
    data.folders = folders;
    data.lastModified = new Date().toISOString();
    saveToLocalStorage(data);
    this.notifyListeners();
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  async getSettings(): Promise<Partial<FirestoreUserSettings>> {
    if (this.useIndexedDB) {
      try {
        const result = await getFromStore<{ key: string } & Partial<FirestoreUserSettings>>(STORE_SETTINGS, "user") as ({ key: string } & Partial<FirestoreUserSettings>) | undefined;
        if (result) {
          const { key: _key, ...settings } = result;
          return settings;
        }
        return {};
      } catch {
        this.useIndexedDB = false;
      }
    }
    const data = loadFromLocalStorage();
    return data?.settings ?? {};
  }

  async saveSettings(settings: Partial<FirestoreUserSettings>): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await putToStore(STORE_SETTINGS, { key: "user", ...settings });
        await this.updateMeta();
        this.notifyListeners();
        return;
      } catch {
        this.useIndexedDB = false;
      }
    }

    const data = loadFromLocalStorage() ?? this.createEmptyData();
    data.settings = { ...data.settings, ...settings };
    data.lastModified = new Date().toISOString();
    saveToLocalStorage(data);
    this.notifyListeners();
  }

  // ─── Meta ───────────────────────────────────────────────────────────────────

  private async updateMeta(): Promise<void> {
    if (this.useIndexedDB) {
      await putToStore(STORE_META, {
        key: "lastModified",
        value: new Date().toISOString(),
        deviceId: this.deviceId,
      });
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<StorageStats> {
    const notes = await this.getAllNotes();
    const folders = await this.getAllFolders();

    let lastModified: Date | null = null;
    if (this.useIndexedDB) {
      try {
        const meta = await getFromStore<{ key: string; value: string }>(STORE_META, "lastModified") as { key: string; value: string } | undefined;
        if (meta) {
          lastModified = new Date(meta.value);
        }
      } catch {
        // Ignore
      }
    } else {
      const data = loadFromLocalStorage();
      if (data?.lastModified) {
        lastModified = new Date(data.lastModified);
      }
    }

    // Estimate size
    const totalSize = notes.reduce((acc, note) => {
      return acc + (note.content?.length ?? 0) + (note.title?.length ?? 0);
    }, 0);

    return {
      notesCount: notes.length,
      foldersCount: folders.length,
      totalSize,
      lastModified,
      storageType: this.useIndexedDB ? "indexeddb" : "localstorage",
    };
  }

  // ─── Export/Import ──────────────────────────────────────────────────────────

  async exportData(): Promise<LocalStorageData> {
    const notes = await this.getAllNotes();
    const folders = await this.getAllFolders();
    const settings = await this.getSettings();

    return {
      notes,
      folders,
      settings,
      lastModified: new Date().toISOString(),
      version: 1,
      deviceId: this.deviceId,
    };
  }

  async importData(data: LocalStorageData): Promise<void> {
    if (data.notes) {
      await this.saveNotes(data.notes);
    }
    if (data.folders) {
      await this.saveFolders(data.folders);
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  // ─── Clear All Data ─────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    if (this.useIndexedDB) {
      try {
        await clearStore(STORE_NOTES);
        await clearStore(STORE_FOLDERS);
        await clearStore(STORE_SETTINGS);
        await clearStore(STORE_META);
      } catch {
        this.useIndexedDB = false;
      }
    }
    localStorage.removeItem(LOCALSTORAGE_KEY);
    this.notifyListeners();
  }

  // ─── Sync with Firestore ────────────────────────────────────────────────────

  /**
   * Prepares local data for sync to Firestore when user logs in.
   * Returns data formatted for Firestore schema.
   */
  async prepareForSync(): Promise<{
    notes: Partial<FirestoreNote>[];
    folders: Partial<FirestoreFolder>[];
    settings: Partial<FirestoreUserSettings>;
  }> {
    const notes = await this.getAllNotes();
    const folders = await this.getAllFolders();
    const settings = await this.getSettings();

    // Convert local notes to Firestore format
    const firestoreNotes: Partial<FirestoreNote>[] = notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      contentSize: note.content.length,
      searchText: this.stripFrontmatter(note.content).slice(0, 10000).toLowerCase(),
      type: (note.type || "markdown") as FirestoreNote["type"],
      folderId: note.folder,
      folderPath: note.folder,
      tags: note.tags,
      aliases: [],
      outgoingLinks: this.extractLinks(note.content),
      backlinks: [],
      starred: note.starred,
      pinned: false,
      archived: false,
      trashed: false,
      trashedAt: null,
      frontmatter: this.extractFrontmatter(note.content),
      wordCount: note.wordCount ?? 0,
      characterCount: note.content.length,
      readingTime: Math.ceil((note.wordCount ?? 0) / 200),
      version: (note.versionHistory?.length ?? 0) + 1,
      contentHash: this.hashContent(note.content),
      lastModifiedBy: this.deviceId,
      isShared: false,
      shareId: null,
      sharePermission: null,
    }));

    // Convert local folders to Firestore format
    const firestoreFolders: Partial<FirestoreFolder>[] = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId ?? null,
      path: folder.name,
      color: null,
      icon: null,
      collapsed: "collapsed" in folder ? Boolean(folder.collapsed) : false,
      sortOrder: 0,
    }));

    return {
      notes: firestoreNotes,
      folders: firestoreFolders,
      settings,
    };
  }

  private extractLinks(content: string): string[] {
    const linkRegex = /!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const rawTarget = match[1].trim();
      const normalizedTarget = rawTarget.split("#")[0].split("^")[0].trim();
      if (normalizedTarget) {
        links.push(normalizedTarget);
      }
    }
    return links;
  }

  private extractFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) return {};

    const result: Record<string, unknown> = {};
    const yamlLines = match[1].split("\n");

    for (const line of yamlLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const colon = trimmed.indexOf(":");
      if (colon <= 0) continue;

      const key = trimmed.slice(0, colon).trim();
      const rawValue = trimmed.slice(colon + 1).trim();

      if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        const values = rawValue
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        result[key] = values;
        continue;
      }

      if (rawValue === "true" || rawValue === "false") {
        result[key] = rawValue === "true";
        continue;
      }

      const numericValue = Number(rawValue);
      if (!Number.isNaN(numericValue) && rawValue !== "") {
        result[key] = numericValue;
        continue;
      }

      result[key] = rawValue;
    }

    return result;
  }

  private stripFrontmatter(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
  }

  private hashContent(content: string): string {
    // Simple hash for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ─── Listeners ──────────────────────────────────────────────────────────────

  onChange(callback: (data: LocalStorageData) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private async notifyListeners(): Promise<void> {
    const data = await this.exportData();
    this.listeners.forEach((cb) => cb(data));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private createEmptyData(): LocalStorageData {
    return {
      notes: [],
      folders: [],
      settings: {},
      lastModified: new Date().toISOString(),
      version: 1,
      deviceId: this.deviceId,
    };
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  isUsingIndexedDB(): boolean {
    return this.useIndexedDB;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let localStorageServiceInstance: LocalStorageService | null = null;

export function getLocalStorageService(): LocalStorageService {
  if (!localStorageServiceInstance) {
    localStorageServiceInstance = new LocalStorageService();
  }
  return localStorageServiceInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";

export function useLocalStorage() {
  const [service] = useState(() => getLocalStorageService());
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    service.initialize().then(() => {
      setIsReady(true);
      service.getStats().then(setStats);
    });

    const unsubscribe = service.onChange(async () => {
      setStats(await service.getStats());
    });

    return () => {
      unsubscribe();
    };
  }, [service]);

  const saveNote = useCallback(async (note: Note) => {
    await service.saveNote(note);
  }, [service]);

  const deleteNote = useCallback(async (id: string) => {
    await service.deleteNote(id);
  }, [service]);

  const getAllNotes = useCallback(async () => {
    return service.getAllNotes();
  }, [service]);

  const exportData = useCallback(async () => {
    return service.exportData();
  }, [service]);

  const importData = useCallback(async (data: LocalStorageData) => {
    await service.importData(data);
  }, [service]);

  const clearAll = useCallback(async () => {
    await service.clearAll();
  }, [service]);

  return {
    service,
    isReady,
    stats,
    saveNote,
    deleteNote,
    getAllNotes,
    exportData,
    importData,
    clearAll,
  };
}
