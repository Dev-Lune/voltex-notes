package `in`.devlune.voltex.ui.home

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import `in`.devlune.voltex.domain.model.AppSyncState
import `in`.devlune.voltex.domain.model.Note
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNoteClick: (String) -> Unit,
    onNewNote: () -> Unit,
    onSearchClick: () -> Unit,
    onSignOut: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val notes by viewModel.visibleNotes.collectAsState()
    val folders by viewModel.folders.collectAsState()
    val syncState by viewModel.syncState.collectAsState()
    val drawerState = rememberDrawerState(DrawerValue.Closed)

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Text(
                    "Voltex Notes",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                HorizontalDivider()

                NavigationDrawerItem(
                    label = { Text("All Notes") },
                    icon = { Icon(Icons.Default.Notes, contentDescription = null) },
                    selected = viewModel.activeFolder.collectAsState().value == null,
                    onClick = { viewModel.selectFolder(null) },
                )

                if (folders.isNotEmpty()) {
                    Text(
                        "Folders",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    folders.forEach { folder ->
                        NavigationDrawerItem(
                            label = { Text(folder.name) },
                            icon = { Icon(Icons.Default.Folder, contentDescription = null) },
                            selected = viewModel.activeFolder.collectAsState().value == folder.id,
                            onClick = { viewModel.selectFolder(folder.id) },
                        )
                    }
                }

                Spacer(Modifier.weight(1f))
                HorizontalDivider()
                NavigationDrawerItem(
                    label = { Text("Sign Out") },
                    icon = { Icon(Icons.Default.ExitToApp, contentDescription = null) },
                    selected = false,
                    onClick = { viewModel.signOut(onSignOut) },
                )
            }
        },
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Notes") },
                    navigationIcon = {
                        IconButton(onClick = { /* open drawer via scope */ }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu")
                        }
                    },
                    actions = {
                        // Sync status indicator
                        when (syncState) {
                            is AppSyncState.Syncing ->
                                CircularProgressIndicator(modifier = Modifier.size(24.dp).padding(4.dp))
                            is AppSyncState.Error ->
                                Icon(Icons.Default.CloudOff, contentDescription = "Sync error",
                                    tint = MaterialTheme.colorScheme.error)
                            else -> {}
                        }
                        IconButton(onClick = onSearchClick) {
                            Icon(Icons.Default.Search, contentDescription = "Search")
                        }
                    },
                )
            },
            floatingActionButton = {
                FloatingActionButton(onClick = onNewNote) {
                    Icon(Icons.Default.Add, contentDescription = "New note")
                }
            },
        ) { padding ->
            if (notes.isEmpty()) {
                EmptyState(modifier = Modifier.padding(padding))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(vertical = 8.dp),
                ) {
                    items(notes, key = { it.id }) { note ->
                        NoteListItem(
                            note = note,
                            onClick = { onNoteClick(note.id) },
                            onStar = { viewModel.starNote(note.id, !note.starred) },
                            onTrash = { viewModel.trashNote(note.id) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun NoteListItem(
    note: Note,
    onClick: () -> Unit,
    onStar: () -> Unit,
    onTrash: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val dateFormat = remember { SimpleDateFormat("MMM d", Locale.getDefault()) }

    ListItem(
        headlineContent = {
            Text(
                note.title.ifBlank { "Untitled" },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                note.content.take(80).replace('\n', ' '),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    dateFormat.format(Date(note.updatedAt)),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (note.starred) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        },
        modifier = Modifier.combinedClickable(
            onClick = onClick,
            onLongClick = { showMenu = true },
        ),
    )

    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
        DropdownMenuItem(
            text = { Text(if (note.starred) "Unstar" else "Star") },
            leadingIcon = {
                Icon(
                    if (note.starred) Icons.Default.StarBorder else Icons.Default.Star,
                    contentDescription = null,
                )
            },
            onClick = { onStar(); showMenu = false },
        )
        DropdownMenuItem(
            text = { Text("Move to Trash") },
            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null) },
            onClick = { onTrash(); showMenu = false },
        )
    }

    HorizontalDivider(thickness = 0.5.dp)
}

@Composable
private fun EmptyState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            Icons.Default.NoteAdd,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        Text(
            "No notes yet",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            "Tap + to create your first note",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.outline,
        )
    }
}
