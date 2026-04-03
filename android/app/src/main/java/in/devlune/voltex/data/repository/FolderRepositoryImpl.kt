package `in`.devlune.voltex.data.repository

import `in`.devlune.voltex.data.local.dao.FolderDao
import `in`.devlune.voltex.data.local.entity.FolderEntity
import `in`.devlune.voltex.domain.model.Folder
import `in`.devlune.voltex.domain.repository.FolderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FolderRepositoryImpl @Inject constructor(
    private val folderDao: FolderDao,
) : FolderRepository {

    override fun observeFolders(): Flow<List<Folder>> =
        folderDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun saveFolder(folder: Folder) =
        folderDao.upsert(folder.toEntity())

    override suspend fun deleteFolder(id: String) =
        folderDao.deleteById(id)

    override suspend fun renameFolder(id: String, name: String) =
        folderDao.rename(id, name)
}

fun FolderEntity.toDomain(): Folder = Folder(
    id = id,
    name = name,
    parentId = parentId,
    sortOrder = sortOrder,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun Folder.toEntity(): FolderEntity = FolderEntity(
    id = id,
    name = name,
    parentId = parentId,
    sortOrder = sortOrder,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
