package `in`.devlune.voltex.domain.usecase.note

import `in`.devlune.voltex.domain.model.Note
import `in`.devlune.voltex.domain.model.SyncStatus
import `in`.devlune.voltex.domain.repository.NoteRepository
import java.security.MessageDigest
import javax.inject.Inject

class SaveNoteUseCase @Inject constructor(private val repository: NoteRepository) {
    suspend operator fun invoke(note: Note) {
        val now = System.currentTimeMillis()
        val words = note.content.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        val hash = note.content.md5()
        val updated = note.copy(
            updatedAt = now,
            wordCount = words.size,
            contentHash = hash,
            syncStatus = SyncStatus.PENDING,
        )
        repository.saveNote(updated)
    }
}

private fun String.md5(): String {
    val digest = MessageDigest.getInstance("MD5")
    return digest.digest(toByteArray()).joinToString("") { "%02x".format(it) }
}
