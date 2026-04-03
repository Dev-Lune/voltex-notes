package `in`.devlune.voltex.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import `in`.devlune.voltex.data.repository.AuthRepositoryImpl
import `in`.devlune.voltex.data.repository.FolderRepositoryImpl
import `in`.devlune.voltex.data.repository.NoteRepositoryImpl
import `in`.devlune.voltex.domain.repository.AuthRepository
import `in`.devlune.voltex.domain.repository.FolderRepository
import `in`.devlune.voltex.domain.repository.NoteRepository
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds @Singleton
    abstract fun bindNoteRepository(impl: NoteRepositoryImpl): NoteRepository

    @Binds @Singleton
    abstract fun bindFolderRepository(impl: FolderRepositoryImpl): FolderRepository

    @Binds @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository
}
