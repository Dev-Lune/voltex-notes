package `in`.devlune.voltex.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.devlune.voltex.domain.model.User
import `in`.devlune.voltex.domain.repository.AuthRepository
import `in`.devlune.voltex.domain.usecase.auth.SignInWithEmailUseCase
import `in`.devlune.voltex.domain.usecase.auth.SignInWithGoogleUseCase
import `in`.devlune.voltex.domain.usecase.auth.SignUpWithEmailUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AuthUiState {
    data object Idle : AuthUiState
    data object Loading : AuthUiState
    data class Error(val message: String) : AuthUiState
    data class Success(val user: User) : AuthUiState
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    authRepository: AuthRepository,
    private val signInWithEmail: SignInWithEmailUseCase,
    private val signUpWithEmail: SignUpWithEmailUseCase,
    private val signInWithGoogle: SignInWithGoogleUseCase,
) : ViewModel() {

    val currentUser: StateFlow<User?> = authRepository.currentUser
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            signInWithEmail(email, password)
                .onSuccess { _uiState.value = AuthUiState.Success(it) }
                .onFailure { _uiState.value = AuthUiState.Error(mapFirebaseError(it.message)) }
        }
    }

    fun signUp(email: String, password: String, displayName: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            signUpWithEmail(email, password, displayName)
                .onSuccess { _uiState.value = AuthUiState.Success(it) }
                .onFailure { _uiState.value = AuthUiState.Error(mapFirebaseError(it.message)) }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            signInWithGoogle.invoke(idToken)
                .onSuccess { _uiState.value = AuthUiState.Success(it) }
                .onFailure { _uiState.value = AuthUiState.Error(mapFirebaseError(it.message)) }
        }
    }

    fun clearError() { _uiState.value = AuthUiState.Idle }

    // Maps Firebase error codes to user-friendly messages (matching AuthModal.tsx)
    private fun mapFirebaseError(message: String?): String = when {
        message == null -> "An error occurred. Please try again."
        "invalid-email" in message -> "Invalid email address."
        "user-disabled" in message -> "This account has been disabled."
        "user-not-found" in message || "invalid-credential" in message -> "Invalid email or password."
        "wrong-password" in message -> "Incorrect password."
        "email-already-in-use" in message -> "An account with this email already exists."
        "weak-password" in message -> "Password should be at least 6 characters."
        "too-many-requests" in message -> "Too many attempts. Please try again later."
        "network-request-failed" in message -> "Network error. Check your connection."
        else -> "An error occurred. Please try again."
    }
}
