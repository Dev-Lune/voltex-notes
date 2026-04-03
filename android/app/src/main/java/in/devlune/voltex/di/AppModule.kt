package `in`.devlune.voltex.di

import android.content.Context
import androidx.room.Room
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import `in`.devlune.voltex.data.local.VoltexDatabase
import `in`.devlune.voltex.data.local.dao.FolderDao
import `in`.devlune.voltex.data.local.dao.NoteDao
import `in`.devlune.voltex.data.local.dao.SyncQueueDao
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): VoltexDatabase =
        Room.databaseBuilder(context, VoltexDatabase::class.java, "voltex.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideNoteDao(db: VoltexDatabase): NoteDao = db.noteDao()
    @Provides fun provideFolderDao(db: VoltexDatabase): FolderDao = db.folderDao()
    @Provides fun provideSyncQueueDao(db: VoltexDatabase): SyncQueueDao = db.syncQueueDao()

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()
}
