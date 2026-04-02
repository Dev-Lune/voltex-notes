package `in`.devlune.voltex.domain.repository

import `in`.devlune.voltex.domain.model.Folder
import kotlinx.coroutines.flow.Flow

interface FolderRepository {
    fun observeFolders(): Flow<List<Folder>>
    suspend fun saveFolder(folder: Folder)
    suspend fun deleteFolder(id: String)
    suspend fun renameFolder(id: String, name: String)
}
