package `in`.devlune.voltex.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import `in`.devlune.voltex.data.local.dao.FolderDao
import `in`.devlune.voltex.data.local.dao.NoteDao
import `in`.devlune.voltex.data.local.dao.SyncQueueDao
import `in`.devlune.voltex.data.local.entity.FolderEntity
import `in`.devlune.voltex.data.local.entity.NoteFtsEntity
import `in`.devlune.voltex.data.local.entity.NoteEntity
import `in`.devlune.voltex.data.local.entity.SyncQueueEntry

@Database(
    entities = [
        NoteEntity::class,
        NoteFtsEntity::class,
        FolderEntity::class,
        SyncQueueEntry::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class VoltexDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun folderDao(): FolderDao
    abstract fun syncQueueDao(): SyncQueueDao
}
