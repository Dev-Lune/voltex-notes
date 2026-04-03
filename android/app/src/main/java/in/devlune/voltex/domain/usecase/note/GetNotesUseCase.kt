package `in`.devlune.voltex.domain.usecase.note

import `in`.devlune.voltex.domain.model.Note
import `in`.devlune.voltex.domain.repository.NoteRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetNotesUseCase @Inject constructor(private val repository: NoteRepository) {
    operator fun invoke(): Flow<List<Note>> = repository.observeNotes()
}
