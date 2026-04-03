package `in`.devlune.voltex.data.sync

import `in`.devlune.voltex.data.local.entity.NoteEntity
import javax.inject.Inject

/**
 * Resolves conflicts between a local note and a remote note.
 * Strategy matches web app's FirestoreUserSettings.sync.conflictResolution options.
 */
class ConflictResolver @Inject constructor() {

    enum class Strategy { LOCAL_WINS, REMOTE_WINS, NEWER_WINS }

    fun resolve(
        local: NoteEntity,
        remote: NoteEntity,
        strategy: Strategy = Strategy.NEWER_WINS,
    ): NoteEntity = when (strategy) {
        Strategy.LOCAL_WINS -> local.copy(syncStatus = "pending")
        Strategy.REMOTE_WINS -> remote.copy(syncStatus = "synced")
        Strategy.NEWER_WINS -> {
            if (local.localUpdatedAt >= remote.updatedAt) {
                local.copy(syncStatus = "pending")
            } else {
                remote.copy(syncStatus = "synced")
            }
        }
    }

    fun hasConflict(local: NoteEntity, remote: NoteEntity): Boolean =
        local.syncStatus == "pending" &&
            local.contentHash.isNotEmpty() &&
            remote.contentHash.isNotEmpty() &&
            local.contentHash != remote.contentHash &&
            local.version != remote.version
}
