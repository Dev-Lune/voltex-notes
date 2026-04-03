package `in`.devlune.voltex.ui.editor

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun EditorToolbar(
    onBold: () -> Unit,
    onItalic: () -> Unit,
    onCode: () -> Unit,
    onHeading: () -> Unit,
    onList: () -> Unit,
    onTask: () -> Unit,
) {
    Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
        ToolbarButton(icon = "B", description = "Bold", onClick = onBold)
        ToolbarButton(icon = "I", description = "Italic", onClick = onItalic)
        ToolbarButton(icon = "<>", description = "Code", onClick = onCode)
        ToolbarButton(icon = "H", description = "Heading", onClick = onHeading)
        IconButton(onClick = onList, modifier = Modifier.size(40.dp)) {
            Icon(Icons.Default.List, contentDescription = "List",
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        IconButton(onClick = onTask, modifier = Modifier.size(40.dp)) {
            Icon(Icons.Default.CheckBox, contentDescription = "Task",
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ToolbarButton(icon: String, description: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(40.dp)) {
        androidx.compose.material3.Text(
            icon,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
