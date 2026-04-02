package `in`.devlune.voltex.domain.repository

import `in`.devlune.voltex.domain.model.Note
import kotlinx.coroutines.flow.Flow

interface NoteRepository {
    fun observeNotes(): Flow<List<Note>>
    fun observeNote(id: String): Flow<Note?>
    suspend fun getNoteById(id: String): Note?
    suspend fun saveNote(note: Note)
    suspend fun deleteNote(id: String)
    suspend fun trashNote(id: String)
    suspend fun restoreNote(id: String)
    suspend fun starNote(id: String, starred: Boolean)
    suspend fun pinNote(id: String, pinned: Boolean)
    fun searchNotes(query: String): Flow<List<Note>>
    fun observeNotesByFolder(folder: String): Flow<List<Note>>
    fun observeStarredNotes(): Flow<List<Note>>
    fun observeTrashedNotes(): Flow<List<Note>>
}
