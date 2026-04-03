package `in`.devlune.voltex.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.devlune.voltex.domain.model.Note
import `in`.devlune.voltex.domain.model.NoteType
import `in`.devlune.voltex.domain.usecase.note.DeleteNoteUseCase
import `in`.devlune.voltex.domain.usecase.note.GetNotesUseCase
import `in`.devlune.voltex.domain.usecase.note.SaveNoteUseCase
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@OptIn(FlowPreview::class)
@HiltViewModel
class EditorViewModel @Inject constructor(
    private val saveNote: SaveNoteUseCase,
    private val deleteNote: DeleteNoteUseCase,
    private val getNotes: GetNotesUseCase,
) : ViewModel() {

    private val _note = MutableStateFlow<Note?>(null)
    val note: StateFlow<Note?> = _note.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    // Debounce auto-save: 1s after last keystroke
    private val _pendingSave = MutableSharedFlow<Note>(extraBufferCapacity = 1)

    init {
        viewModelScope.launch {
            _pendingSave
                .debounce(1_000)
                .collect { note ->
                    _isSaving.value = true
                    saveNote(note)
                    _isSaving.value = false
                }
        }
    }

    fun loadNote(noteId: String?) {
        viewModelScope.launch {
            if (noteId == null) {
                // New note
                _note.value = Note(
                    id = UUID.randomUUID().toString(),
                    title = "",
                    content = "",
                    type = NoteType.MARKDOWN,
                )
            } else {
                getNotes().map { list -> list.firstOrNull { it.id == noteId } }
                    .collect { _note.value = it }
            }
        }
    }

    fun updateTitle(title: String) {
        val current = _note.value ?: return
        val updated = current.copy(title = title)
        _note.value = updated
        _pendingSave.tryEmit(updated)
    }

    fun updateContent(content: String) {
        val current = _note.value ?: return
        val updated = current.copy(content = content)
        _note.value = updated
        _pendingSave.tryEmit(updated)
    }

    fun saveNow() {
        viewModelScope.launch {
            val current = _note.value ?: return@launch
            _isSaving.value = true
            saveNote(current)
            _isSaving.value = false
        }
    }

    fun delete(onDone: () -> Unit) {
        viewModelScope.launch {
            _note.value?.let { deleteNote(it.id) }
            onDone()
        }
    }
}
