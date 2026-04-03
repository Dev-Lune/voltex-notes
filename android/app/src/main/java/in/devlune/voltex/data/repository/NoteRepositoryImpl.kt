package `in`.devlune.voltex.data.repository

import `in`.devlune.voltex.data.local.dao.NoteDao
import `in`.devlune.voltex.data.local.entity.NoteEntity
import `in`.devlune.voltex.domain.model.Note
import `in`.devlune.voltex.domain.model.NoteType
import `in`.devlune.voltex.domain.model.SyncStatus
import `in`.devlune.voltex.domain.repository.NoteRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NoteRepositoryImpl @Inject constructor(
    private val noteDao: NoteDao,
) : NoteRepository {

    override fun observeNotes(): Flow<List<Note>> =
        noteDao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observeNote(id: String): Flow<Note?> =
        noteDao.observeById(id).map { it?.toDomain() }

    override suspend fun getNoteById(id: String): Note? =
        noteDao.getById(id)?.toDomain()

    override suspend fun saveNote(note: Note) =
        noteDao.upsert(note.toEntity())

    override suspend fun deleteNote(id: String) =
        noteDao.deleteById(id)

    override suspend fun trashNote(id: String) =
        noteDao.trash(id)

    override suspend fun restoreNote(id: String) =
        noteDao.restore(id)

    override suspend fun starNote(id: String, starred: Boolean) =
        noteDao.updateStarred(id, starred)

    override suspend fun pinNote(id: String, pinned: Boolean) =
        noteDao.updatePinned(id, pinned)

    override fun searchNotes(query: String): Flow<List<Note>> =
        // Wrap query in FTS match syntax
        noteDao.search("\"$query*\"").map { list -> list.map { it.toDomain() } }

    override fun observeNotesByFolder(folder: String): Flow<List<Note>> =
        noteDao.observeByFolder(folder).map { list -> list.map { it.toDomain() } }

    override fun observeStarredNotes(): Flow<List<Note>> =
        noteDao.observeStarred().map { list -> list.map { it.toDomain() } }

    override fun observeTrashedNotes(): Flow<List<Note>> =
        noteDao.observeTrashed().map { list -> list.map { it.toDomain() } }
}

// ---------- Mapping extensions ----------

fun NoteEntity.toDomain(): Note = Note(
    id = id,
    title = title,
    content = content,
    type = NoteType.fromValue(type),
    folder = folder,
    tags = parseJsonArray(tags),
    starred = starred,
    pinned = pinned,
    trashed = trashed,
    trashedAt = trashedAt,
    createdAt = createdAt,
    updatedAt = updatedAt,
    wordCount = wordCount,
    drawingData = drawingData,
    version = version,
    contentHash = contentHash,
    syncStatus = SyncStatus.valueOf(syncStatus.uppercase()),
)

fun Note.toEntity(): NoteEntity = NoteEntity(
    id = id,
    title = title,
    content = content,
    type = type.value,
    folder = folder,
    tags = serializeTagList(tags),
    starred = starred,
    pinned = pinned,
    trashed = trashed,
    trashedAt = trashedAt,
    createdAt = createdAt,
    updatedAt = updatedAt,
    wordCount = wordCount,
    drawingData = drawingData,
    version = version,
    contentHash = contentHash,
    syncStatus = syncStatus.name.lowercase(),
    localUpdatedAt = System.currentTimeMillis(),
)

private fun parseJsonArray(json: String): List<String> = try {
    json.trim().removePrefix("[").removeSuffix("]")
        .split(",")
        .map { it.trim().removeSurrounding("\"") }
        .filter { it.isNotEmpty() }
} catch (e: Exception) { emptyList() }

private fun serializeTagList(tags: List<String>): String =
    "[${tags.joinToString(",") { "\"$it\"" }}]"
