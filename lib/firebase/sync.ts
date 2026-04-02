/**
 * Firebase Sync Service
 * 
 * Handles real-time synchronization of notes between devices via Firestore.
 * Implements conflict resolution and offline support.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type { Note } from "@/components/obsidian/data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  pendingChanges: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  noteId: string;
  localVersion: Note;
  remoteVersion: Note;
  detectedAt: Date;
}

export interface SyncOptions {
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: "local" | "remote" | "manual";
  offlineQueueMaxSize: number;
}

// ─── Default Options ──────────────────────────────────────────────────────────

export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  autoSync: true,
  syncInterval: 30000,
  conflictResolution: "manual",
  offlineQueueMaxSize: 1000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function noteToFirestore(note: Note) {
  const data: Record<string, unknown> = {
    id: note.id,
    title: note.title,
    content: note.content,
    type: note.type || "markdown",
    folder: note.folder || "root",
    tags: note.tags || [],
    starred: note.starred || false,
    pinned: note.pinned || false,
    trashed: note.trashed || false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt || new Date().toISOString(),
    wordCount: note.wordCount || 0,
    _serverUpdatedAt: serverTimestamp(),
  };
  if (note.trashedAt) data.trashedAt = note.trashedAt;
  if (note.drawingData) data.drawingData = note.drawingData;
  return data;
}

function firestoreToNote(data: Record<string, unknown>): Note {
  return {
    id: data.id as string,
    title: data.title as string,
    content: (data.content as string) || "",
    type: (data.type as Note["type"]) || "markdown",
    folder: (data.folder as string) || "root",
    tags: Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? [data.tags] : [],
    starred: (data.starred as boolean) || false,
    pinned: (data.pinned as boolean) || false,
    trashed: (data.trashed as boolean) || false,
    trashedAt: data.trashedAt as string | undefined,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    wordCount: (data.wordCount as number) || 0,
    drawingData: data.drawingData as string | undefined,
  };
}

// ─── Sync Service ─────────────────────────────────────────────────────────────

export class SyncService {
  private userId: string;
  private options: SyncOptions;
  private state: SyncState;
  private offlineQueue: Array<{ action: "create" | "update" | "delete"; note: Note }>;
  private firestoreUnsub: Unsubscribe | null = null;
  private listeners: {
    onStatusChange: Array<(status: SyncStatus) => void>;
    onRemoteChange: Array<(notes: Note[]) => void>;
    onConflict: Array<(conflict: SyncConflict) => void>;
  };

  constructor(userId: string, options: Partial<SyncOptions> = {}) {
    this.userId = userId;
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options };
    this.state = {
      status: "offline",
      lastSyncedAt: null,
      pendingChanges: 0,
      conflicts: [],
    };
    this.offlineQueue = [];
    this.listeners = {
      onStatusChange: [],
      onRemoteChange: [],
      onConflict: [],
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const db = getFirebaseDb();
    if (!db) {
      this.updateStatus("offline");
      return;
    }

    this.updateStatus("syncing");

    try {
      const notesRef = collection(db, "users", this.userId, "notes");
      const q = query(notesRef);

      this.firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          const notes: Note[] = [];
          snapshot.forEach((docSnap) => {
            notes.push(firestoreToNote(docSnap.data()));
          });
          this.listeners.onRemoteChange.forEach((cb) => cb(notes));
          this.state.lastSyncedAt = new Date();
          this.updateStatus("synced");
        },
        () => {
          this.updateStatus("error");
        }
      );
    } catch {
      this.updateStatus("error");
    }
  }

  async destroy(): Promise<void> {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
    this.listeners.onStatusChange = [];
    this.listeners.onRemoteChange = [];
    this.listeners.onConflict = [];
  }

  // ─── Note Operations ──────────────────────────────────────────────────────

  async pushNote(note: Note): Promise<void> {
    const db = getFirebaseDb();
    if (!db) {
      this.queueOfflineChange("update", note);
      return;
    }

    this.updateStatus("syncing");

    try {
      const noteRef = doc(db, "users", this.userId, "notes", note.id);
      await setDoc(noteRef, noteToFirestore(note), { merge: true });
      this.updateStatus("synced");
      this.state.lastSyncedAt = new Date();
    } catch {
      this.queueOfflineChange("update", note);
      this.updateStatus("error");
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    this.updateStatus("syncing");

    try {
      const noteRef = doc(db, "users", this.userId, "notes", noteId);
      await deleteDoc(noteRef);
      this.updateStatus("synced");
    } catch {
      this.updateStatus("error");
    }
  }

  async syncAll(notes: Note[]): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    this.updateStatus("syncing");

    try {
      for (const note of notes) {
        const noteRef = doc(db, "users", this.userId, "notes", note.id);
        await setDoc(noteRef, noteToFirestore(note), { merge: true });
      }
      await this.processOfflineQueue();
      this.updateStatus("synced");
      this.state.lastSyncedAt = new Date();
    } catch {
      this.updateStatus("error");
    }
  }

  // ─── Conflict Resolution ──────────────────────────────────────────────────

  async resolveConflict(
    conflictId: string,
    resolution: "local" | "remote"
  ): Promise<void> {
    const conflict = this.state.conflicts.find(
      (c) => c.noteId === conflictId
    );
    if (!conflict) return;

    const resolvedNote = resolution === "local"
      ? conflict.localVersion
      : conflict.remoteVersion;

    await this.pushNote(resolvedNote);

    this.state.conflicts = this.state.conflicts.filter(
      (c) => c.noteId !== conflictId
    );
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.onStatusChange.push(callback);
    return () => {
      this.listeners.onStatusChange = this.listeners.onStatusChange.filter(
        (cb) => cb !== callback
      );
    };
  }

  onRemoteChange(callback: (notes: Note[]) => void): () => void {
    this.listeners.onRemoteChange.push(callback);
    return () => {
      this.listeners.onRemoteChange = this.listeners.onRemoteChange.filter(
        (cb) => cb !== callback
      );
    };
  }

  onConflict(callback: (conflict: SyncConflict) => void): () => void {
    this.listeners.onConflict.push(callback);
    return () => {
      this.listeners.onConflict = this.listeners.onConflict.filter(
        (cb) => cb !== callback
      );
    };
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  getState(): SyncState {
    return { ...this.state };
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  private updateStatus(status: SyncStatus): void {
    this.state.status = status;
    this.listeners.onStatusChange.forEach((cb) => cb(status));
  }

  private queueOfflineChange(
    action: "create" | "update" | "delete",
    note: Note
  ): void {
    if (this.offlineQueue.length >= this.options.offlineQueueMaxSize) {
      this.offlineQueue.shift();
    }
    this.offlineQueue.push({ action, note });
    this.state.pendingChanges = this.offlineQueue.length;
  }

  private async processOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (!item) break;

      try {
        switch (item.action) {
          case "create":
          case "update":
            await this.pushNote(item.note);
            break;
          case "delete":
            await this.deleteNote(item.note.id);
            break;
        }
      } catch {
        this.offlineQueue.unshift(item);
        break;
      }
    }
    this.state.pendingChanges = this.offlineQueue.length;
  }
}

// ─── Hook for React ───────────────────────────────────────────────────────────

export function createSyncHook(userId: string | null) {
  let service: SyncService | null = null;

  return {
    initialize: async () => {
      if (!userId) return;
      service = new SyncService(userId);
      await service.initialize();
    },
    getService: () => service,
    destroy: async () => {
      if (service) {
        await service.destroy();
        service = null;
      }
    },
  };
}
