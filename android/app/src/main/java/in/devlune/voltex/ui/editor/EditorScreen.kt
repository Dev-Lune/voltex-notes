package `in`.devlune.voltex.ui.editor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

enum class ViewMode { EDIT, PREVIEW }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditorScreen(
    noteId: String?,
    onBack: () -> Unit,
    viewModel: EditorViewModel = hiltViewModel(),
) {
    val note by viewModel.note.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    var viewMode by remember { mutableStateOf(ViewMode.EDIT) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(noteId) { viewModel.loadNote(noteId) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Note") },
            text = { Text("This note will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = { viewModel.delete(onBack) }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (isSaving) {
                        Text("Saving…", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.saveNow(); onBack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewMode = if (viewMode == ViewMode.EDIT) ViewMode.PREVIEW else ViewMode.EDIT
                    }) {
                        Icon(
                            if (viewMode == ViewMode.EDIT) Icons.Default.Preview else Icons.Default.Edit,
                            contentDescription = "Toggle preview",
                        )
                    }
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete")
                    }
                },
            )
        },
    ) { padding ->
        note?.let { currentNote ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
            ) {
                // Title field
                BasicTextField(
                    value = currentNote.title,
                    onValueChange = viewModel::updateTitle,
                    textStyle = TextStyle(
                        fontSize = 22.sp,
                        color = MaterialTheme.colorScheme.onBackground,
                    ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    decorationBox = { inner ->
                        if (currentNote.title.isEmpty()) {
                            Text("Untitled", color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 22.sp)
                        }
                        inner()
                    },
                )

                HorizontalDivider()

                if (viewMode == ViewMode.EDIT) {
                    EditorToolbar(
                        onBold = { viewModel.updateContent(currentNote.content + "**bold**") },
                        onItalic = { viewModel.updateContent(currentNote.content + "*italic*") },
                        onCode = { viewModel.updateContent(currentNote.content + "`code`") },
                        onHeading = { viewModel.updateContent("# " + currentNote.content) },
                        onList = { viewModel.updateContent(currentNote.content + "\n- ") },
                        onTask = { viewModel.updateContent(currentNote.content + "\n- [ ] ") },
                    )
                    HorizontalDivider()

                    BasicTextField(
                        value = currentNote.content,
                        onValueChange = viewModel::updateContent,
                        textStyle = TextStyle(
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onBackground,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 22.sp,
                        ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(vertical = 12.dp)
                            .verticalScroll(rememberScrollState()),
                        decorationBox = { inner ->
                            if (currentNote.content.isEmpty()) {
                                Text("Start writing…",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 15.sp)
                            }
                            inner()
                        },
                    )
                } else {
                    // Preview mode — rendered markdown
                    MarkdownPreview(
                        markdown = currentNote.content,
                        modifier = Modifier.fillMaxSize().padding(vertical = 12.dp)
                            .verticalScroll(rememberScrollState()),
                    )
                }
            }
        } ?: Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            CircularProgressIndicator(modifier = Modifier.align(androidx.compose.ui.Alignment.Center))
        }
    }
}
