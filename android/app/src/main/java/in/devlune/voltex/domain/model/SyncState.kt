package `in`.devlune.voltex.domain.model

sealed interface AppSyncState {
    data object Synced : AppSyncState
    data object Syncing : AppSyncState
    data object Offline : AppSyncState
    data class Error(val message: String) : AppSyncState
}
