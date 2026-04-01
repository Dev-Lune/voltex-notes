/**
 * Firebase Module Exports
 * 
 * Central export file for Firebase services.
 */

export {
  getFirebaseConfig,
  isFirebaseConfigured,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  type FirebaseConfig,
} from "./config";

export {
  SyncService,
  createSyncHook,
  DEFAULT_SYNC_OPTIONS,
  type SyncStatus,
  type SyncState,
  type SyncConflict,
  type SyncOptions,
} from "./sync";
