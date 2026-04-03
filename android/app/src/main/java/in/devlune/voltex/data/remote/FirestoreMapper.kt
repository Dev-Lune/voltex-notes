package `in`.devlune.voltex.data.remote

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import `in`.devlune.voltex.data.local.entity.FolderEntity
import `in`.devlune.voltex.data.local.entity.NoteEntity
import java.util.Date

/**
 * Maps between Room entities and Firestore documents.
 *
 * Field names MUST match exactly what the web app writes in noteToFirestore()
 * from lib/firebase/sync.ts. The web app uses "folder" (not "folderId").
 */
object FirestoreMapper {

    // ---------- Note → Firestore ----------

    fun noteEntityToFirestore(entity: NoteEntity): Map<String, Any?> = buildMap {
        put("id", entity.id)
        put("title", entity.title)
        put("content", entity.content)
        put("type", entity.type)
        put("folder", entity.folder)                        // "folder" matches sync.ts line ~63
        put("tags", parseJsonArray(entity.tags))
        put("starred", entity.starred)
        put("pinned", entity.pinned)
        put("trashed", entity.trashed)
        put("trashedAt", entity.trashedAt?.let { Timestamp(Date(it)) })
        put("createdAt", Timestamp(Date(entity.createdAt)))
        put("updatedAt", Timestamp(Date(entity.updatedAt)))
        put("wordCount", entity.wordCount)
        put("_serverUpdatedAt", FieldValue.serverTimestamp())  // required by web sync.ts
        if (entity.drawingData != null) put("drawingData", entity.drawingData)
    }

    // ---------- Firestore → Note ----------

    fun firestoreToNoteEntity(id: String, data: Map<String, Any>): NoteEntity {
        return NoteEntity(
            id = id,
            title = data["title"] as? String ?: "",
            content = data["content"] as? String ?: "",
            type = data["type"] as? String ?: "markdown",
            folder = data["folder"] as? String ?: "root",
            tags = serializeTagList(data["tags"]),
            starred = data["starred"] as? Boolean ?: false,
            pinned = data["pinned"] as? Boolean ?: false,
            trashed = data["trashed"] as? Boolean ?: false,
            trashedAt = (data["trashedAt"] as? Timestamp)?.toDate()?.time,
            createdAt = (data["createdAt"] as? Timestamp)?.toDate()?.time
                ?: System.currentTimeMillis(),
            updatedAt = (data["updatedAt"] as? Timestamp)?.toDate()?.time
                ?: System.currentTimeMillis(),
            wordCount = (data["wordCount"] as? Long)?.toInt() ?: 0,
            drawingData = data["drawingData"] as? String,
            version = (data["version"] as? Long)?.toInt() ?: 1,
            contentHash = data["contentHash"] as? String ?: "",
            syncStatus = "synced",
        )
    }

    // ---------- Folder → Firestore ----------

    fun folderEntityToFirestore(entity: FolderEntity): Map<String, Any?> = buildMap {
        put("id", entity.id)
        put("name", entity.name)
        put("parentId", entity.parentId)
        put("sortOrder", entity.sortOrder)
        put("createdAt", Timestamp(Date(entity.createdAt)))
        put("updatedAt", Timestamp(Date(entity.updatedAt)))
    }

    fun firestoreToFolderEntity(id: String, data: Map<String, Any>): FolderEntity {
        return FolderEntity(
            id = id,
            name = data["name"] as? String ?: "",
            parentId = data["parentId"] as? String,
            sortOrder = (data["sortOrder"] as? Long)?.toInt() ?: 0,
            createdAt = (data["createdAt"] as? Timestamp)?.toDate()?.time
                ?: System.currentTimeMillis(),
            updatedAt = (data["updatedAt"] as? Timestamp)?.toDate()?.time
                ?: System.currentTimeMillis(),
        )
    }

    // ---------- Helpers ----------

    @Suppress("UNCHECKED_CAST")
    private fun parseJsonArray(json: String): List<String> {
        return try {
            // Simple parsing — removes brackets and splits by comma
            json.trim().removePrefix("[").removeSuffix("]")
                .split(",")
                .map { it.trim().removeSurrounding("\"") }
                .filter { it.isNotEmpty() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun serializeTagList(value: Any?): String {
        val list = value as? List<String> ?: return "[]"
        return "[${list.joinToString(",") { "\"$it\"" }}]"
    }
}
