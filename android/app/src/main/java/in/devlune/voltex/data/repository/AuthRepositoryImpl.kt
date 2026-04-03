package `in`.devlune.voltex.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.userProfileChangeRequest
import `in`.devlune.voltex.domain.model.User
import `in`.devlune.voltex.domain.repository.AuthRepository
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val auth: FirebaseAuth,
) : AuthRepository {

    override val currentUser: Flow<User?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser?.toDomain())
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    override fun isSignedIn(): Boolean = auth.currentUser != null

    override suspend fun signInWithEmail(email: String, password: String): Result<User> =
        runCatching {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            result.user?.toDomain() ?: error("Sign-in succeeded but user is null")
        }

    override suspend fun signUpWithEmail(
        email: String,
        password: String,
        displayName: String,
    ): Result<User> = runCatching {
        val result = auth.createUserWithEmailAndPassword(email, password).await()
        val user = result.user ?: error("Sign-up succeeded but user is null")
        user.updateProfile(userProfileChangeRequest { this.displayName = displayName }).await()
        user.toDomain()
    }

    override suspend fun signInWithGoogle(idToken: String): Result<User> = runCatching {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        val result = auth.signInWithCredential(credential).await()
        result.user?.toDomain() ?: error("Google sign-in succeeded but user is null")
    }

    override suspend fun signOut() = auth.signOut()
}

private fun com.google.firebase.auth.FirebaseUser.toDomain() = User(
    uid = uid,
    email = email ?: "",
    displayName = displayName,
    photoUrl = photoUrl?.toString(),
)
