package `in`.devlune.voltex.data.local.dao

import androidx.room.*
import `in`.devlune.voltex.data.local.entity.SyncQueueEntry
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Query("SELECT * FROM sync_queue ORDER BY created_at ASC")
    suspend fun getAll(): List<SyncQueueEntry>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(entry: SyncQueueEntry)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun remove(id: Long)

    @Query("DELETE FROM sync_queue WHERE note_id = :noteId")
    suspend fun removeByNoteId(noteId: String)

    @Query("UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = :id")
    suspend fun incrementRetry(id: Long)

    @Query("SELECT COUNT(*) FROM sync_queue")
    fun observeCount(): Flow<Int>
}
