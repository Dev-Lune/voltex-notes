package `in`.devlune.voltex.data.remote

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import `in`.devlune.voltex.data.local.entity.NoteEntity
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirestoreNoteSource @Inject constructor(
    private val firestore: FirebaseFirestore,
) {
    private fun notesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("notes")

    /**
     * Real-time listener matching the web app's onSnapshot on users/{userId}/notes.
     * Emits the full note list on every remote change.
     */
    fun observeNotes(userId: String): Flow<List<NoteEntity>> = callbackFlow {
        var registration: ListenerRegistration? = null
        registration = notesCollection(userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val notes = snapshot.documents.mapNotNull { doc ->
                    doc.data?.let { FirestoreMapper.firestoreToNoteEntity(doc.id, it) }
                }
                trySend(notes)
            }
        awaitClose { registration?.remove() }
    }

    /** Push a note using merge write — matches setDoc(ref, data, { merge: true }) from sync.ts */
    suspend fun pushNote(userId: String, entity: NoteEntity) {
        val data = FirestoreMapper.noteEntityToFirestore(entity)
        notesCollection(userId)
            .document(entity.id)
            .set(data, SetOptions.merge())
            .await()
    }

    suspend fun deleteNote(userId: String, noteId: String) {
        notesCollection(userId).document(noteId).delete().await()
    }

    suspend fun fetchAll(userId: String): List<NoteEntity> {
        val snapshot = notesCollection(userId).get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.data?.let { FirestoreMapper.firestoreToNoteEntity(doc.id, it) }
        }
    }

    /** Register this device in users/{userId}/sync/state.devices[] */
    suspend fun registerDevice(userId: String, deviceId: String, deviceName: String) {
        val deviceEntry = mapOf(
            "id" to deviceId,
            "name" to deviceName,
            "platform" to "android",
            "lastActiveAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
        )
        firestore.collection("users").document(userId)
            .collection("sync").document("state")
            .set(
                mapOf("devices" to com.google.firebase.firestore.FieldValue.arrayUnion(deviceEntry)),
                SetOptions.merge(),
            )
            .await()
    }
}
