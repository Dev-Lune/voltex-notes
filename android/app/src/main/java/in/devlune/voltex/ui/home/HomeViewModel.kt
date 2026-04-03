package `in`.devlune.voltex.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.devlune.voltex.data.sync.SyncManager
import `in`.devlune.voltex.domain.model.AppSyncState
import `in`.devlune.voltex.domain.model.Folder
import `in`.devlune.voltex.domain.model.Note
import `in`.devlune.voltex.domain.repository.AuthRepository
import `in`.devlune.voltex.domain.repository.FolderRepository
import `in`.devlune.voltex.domain.repository.NoteRepository
import `in`.devlune.voltex.domain.usecase.auth.SignOutUseCase
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val noteRepository: NoteRepository,
    private val folderRepository: FolderRepository,
    private val authRepository: AuthRepository,
    private val syncManager: SyncManager,
    private val signOut: SignOutUseCase,
) : ViewModel() {

    val notes: StateFlow<List<Note>> = noteRepository.observeNotes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val folders: StateFlow<List<Folder>> = folderRepository.observeFolders()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val syncState: StateFlow<AppSyncState> = syncManager.syncState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppSyncState.Offline)

    val currentUser = authRepository.currentUser
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _activeFolder = MutableStateFlow<String?>(null)
    val activeFolder: StateFlow<String?> = _activeFolder.asStateFlow()

    val visibleNotes: StateFlow<List<Note>> = combine(notes, activeFolder) { notes, folder ->
        if (folder == null) notes else notes.filter { it.folder == folder }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun selectFolder(folderId: String?) { _activeFolder.value = folderId }

    fun deleteNote(noteId: String) {
        viewModelScope.launch { noteRepository.deleteNote(noteId) }
    }

    fun trashNote(noteId: String) {
        viewModelScope.launch { noteRepository.trashNote(noteId) }
    }

    fun starNote(noteId: String, starred: Boolean) {
        viewModelScope.launch { noteRepository.starNote(noteId, starred) }
    }

    fun signOut(onDone: () -> Unit) {
        viewModelScope.launch {
            syncManager.stop()
            signOut()
            onDone()
        }
    }

    fun refresh() {
        viewModelScope.launch { syncManager.pushPendingChanges() }
    }
}
