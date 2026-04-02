package `in`.devlune.voltex.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Fts4
import androidx.room.PrimaryKey

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val type: String = "markdown",
    // Matches the "folder" field written by noteToFirestore() in sync.ts
    val folder: String = "root",
    val tags: String = "[]",               // JSON array stored as string
    val starred: Boolean = false,
    val pinned: Boolean = false,
    val trashed: Boolean = false,
    @ColumnInfo(name = "trashed_at") val trashedAt: Long? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "word_count") val wordCount: Int = 0,
    @ColumnInfo(name = "drawing_data") val drawingData: String? = null,
    val version: Int = 1,
    @ColumnInfo(name = "content_hash") val contentHash: String = "",
    @ColumnInfo(name = "sync_status") val syncStatus: String = "synced",
    @ColumnInfo(name = "local_updated_at") val localUpdatedAt: Long = System.currentTimeMillis(),
)

// FTS virtual table for full-text search
@Fts4(contentEntity = NoteEntity::class)
@Entity(tableName = "notes_fts")
data class NoteFtsEntity(
    val title: String,
    val content: String,
)
