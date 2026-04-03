package `in`.devlune.voltex.domain.model

data class Folder(
    val id: String,
    val name: String,
    val parentId: String? = null,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)
