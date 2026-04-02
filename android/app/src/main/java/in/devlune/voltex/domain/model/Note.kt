package `in`.devlune.voltex.domain.model

data class Note(
    val id: String,
    val title: String,
    val content: String,
    val type: NoteType = NoteType.MARKDOWN,
    // Matches the "folder" field written by sync.ts (NOT "folderId")
    val folder: String = "root",
    val tags: List<String> = emptyList(),
    val starred: Boolean = false,
    val pinned: Boolean = false,
    val trashed: Boolean = false,
    val trashedAt: Long? = null,          // epoch millis
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val wordCount: Int = 0,
    val drawingData: String? = null,
    val version: Int = 1,
    val contentHash: String = "",
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
)

enum class SyncStatus { SYNCED, PENDING, CONFLICT }
