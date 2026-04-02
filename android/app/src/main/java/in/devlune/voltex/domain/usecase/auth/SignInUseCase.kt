package `in`.devlune.voltex.domain.usecase.auth

import `in`.devlune.voltex.domain.model.User
import `in`.devlune.voltex.domain.repository.AuthRepository
import javax.inject.Inject

class SignInWithEmailUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(email: String, password: String): Result<User> =
        repository.signInWithEmail(email, password)
}

class SignUpWithEmailUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(email: String, password: String, displayName: String): Result<User> =
        repository.signUpWithEmail(email, password, displayName)
}

class SignInWithGoogleUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(idToken: String): Result<User> =
        repository.signInWithGoogle(idToken)
}

class SignOutUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke() = repository.signOut()
}
