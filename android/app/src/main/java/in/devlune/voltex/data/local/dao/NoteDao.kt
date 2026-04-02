package `in`.devlune.voltex.data.local.dao

import androidx.room.*
import `in`.devlune.voltex.data.local.entity.NoteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteDao {

    @Query("SELECT * FROM notes WHERE trashed = 0 ORDER BY updated_at DESC")
    fun observeAll(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE id = :id")
    fun observeById(id: String): Flow<NoteEntity?>

    @Query("SELECT * FROM notes WHERE id = :id")
    suspend fun getById(id: String): NoteEntity?

    @Query("SELECT * FROM notes WHERE folder = :folder AND trashed = 0 ORDER BY updated_at DESC")
    fun observeByFolder(folder: String): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE starred = 1 AND trashed = 0 ORDER BY updated_at DESC")
    fun observeStarred(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE trashed = 1 ORDER BY trashed_at DESC")
    fun observeTrashed(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE sync_status = 'pending' ORDER BY local_updated_at ASC")
    suspend fun getPendingSync(): List<NoteEntity>

    // FTS search — joins notes_fts back to notes for full entity
    @Query("""
        SELECT notes.* FROM notes
        INNER JOIN notes_fts ON notes.id = notes_fts.rowid
        WHERE notes_fts MATCH :query AND notes.trashed = 0
        ORDER BY notes.updated_at DESC
    """)
    fun search(query: String): Flow<List<NoteEntity>>

    @Upsert
    suspend fun upsert(note: NoteEntity)

    @Upsert
    suspend fun upsertAll(notes: List<NoteEntity>)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE notes SET starred = :starred, sync_status = 'pending', local_updated_at = :now WHERE id = :id")
    suspend fun updateStarred(id: String, starred: Boolean, now: Long = System.currentTimeMillis())

    @Query("UPDATE notes SET pinned = :pinned, sync_status = 'pending', local_updated_at = :now WHERE id = :id")
    suspend fun updatePinned(id: String, pinned: Boolean, now: Long = System.currentTimeMillis())

    @Query("UPDATE notes SET trashed = 1, trashed_at = :now, sync_status = 'pending', local_updated_at = :now WHERE id = :id")
    suspend fun trash(id: String, now: Long = System.currentTimeMillis())

    @Query("UPDATE notes SET trashed = 0, trashed_at = NULL, sync_status = 'pending', local_updated_at = :now WHERE id = :id")
    suspend fun restore(id: String, now: Long = System.currentTimeMillis())

    @Query("UPDATE notes SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)
}
