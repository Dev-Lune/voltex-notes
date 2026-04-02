package `in`.devlune.voltex.data.sync

import android.util.Log
import `in`.devlune.voltex.data.local.dao.NoteDao
import `in`.devlune.voltex.data.local.dao.SyncQueueDao
import `in`.devlune.voltex.data.local.entity.NoteEntity
import `in`.devlune.voltex.data.local.entity.SyncQueueEntry
import `in`.devlune.voltex.data.remote.FirestoreNoteSource
import `in`.devlune.voltex.domain.model.AppSyncState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "SyncManager"

@Singleton
class SyncManager @Inject constructor(
    private val noteDao: NoteDao,
    private val syncQueueDao: SyncQueueDao,
    private val firestoreSource: FirestoreNoteSource,
    private val conflictResolver: ConflictResolver,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _syncState = MutableStateFlow<AppSyncState>(AppSyncState.Offline)
    val syncState: StateFlow<AppSyncState> = _syncState.asStateFlow()

    private var currentUserId: String? = null

    /** Call after user signs in. Starts the real-time Firestore listener. */
    fun start(userId: String) {
        currentUserId = userId
        _syncState.value = AppSyncState.Syncing

        // Listen for remote changes and merge into Room
        scope.launch {
            firestoreSource.observeNotes(userId).collect { remoteNotes ->
                mergeRemoteNotes(remoteNotes)
                _syncState.value = AppSyncState.Synced
            }
        }
    }

    fun stop() {
        currentUserId = null
        _syncState.value = AppSyncState.Offline
    }

    /** Push all pending local changes to Firestore. Called by SyncWorker and on reconnect. */
    suspend fun pushPendingChanges() {
        val userId = currentUserId ?: return
        _syncState.value = AppSyncState.Syncing
        try {
            val pending = noteDao.getPendingSync()
            pending.forEach { entity ->
                firestoreSource.pushNote(userId, entity)
                noteDao.updateSyncStatus(entity.id, "synced")
            }
            processSyncQueue(userId)
            _syncState.value = AppSyncState.Synced
        } catch (e: Exception) {
            Log.e(TAG, "Push failed", e)
            _syncState.value = AppSyncState.Error(e.message ?: "Sync failed")
        }
    }

    /** Enqueue a delete operation for background processing. */
    suspend fun enqueueDelete(noteId: String) {
        syncQueueDao.enqueue(
            SyncQueueEntry(noteId = noteId, action = "delete")
        )
    }

    private suspend fun mergeRemoteNotes(remoteNotes: List<NoteEntity>) {
        remoteNotes.forEach { remote ->
            val local = noteDao.getById(remote.id)
            if (local == null) {
                // New note from remote — insert directly
                noteDao.upsert(remote.copy(syncStatus = "synced"))
            } else if (local.syncStatus == "pending") {
                // Conflict: local has unsaved changes
                if (conflictResolver.hasConflict(local, remote)) {
                    val resolved = conflictResolver.resolve(local, remote)
                    noteDao.upsert(resolved)
                    if (resolved.syncStatus == "pending") {
                        // Our version won — push it up
                        currentUserId?.let { firestoreSource.pushNote(it, resolved) }
                    }
                }
            } else {
                // No conflict — accept remote
                noteDao.upsert(remote.copy(syncStatus = "synced"))
            }
        }
    }

    private suspend fun processSyncQueue(userId: String) {
        val queue = syncQueueDao.getAll()
        queue.forEach { entry ->
            try {
                when (entry.action) {
                    "delete" -> firestoreSource.deleteNote(userId, entry.noteId)
                    else -> {
                        val note = noteDao.getById(entry.noteId)
                        if (note != null) firestoreSource.pushNote(userId, note)
                    }
                }
                syncQueueDao.remove(entry.id)
            } catch (e: Exception) {
                Log.w(TAG, "Queue entry ${entry.id} failed, will retry", e)
                syncQueueDao.incrementRetry(entry.id)
            }
        }
    }
}
