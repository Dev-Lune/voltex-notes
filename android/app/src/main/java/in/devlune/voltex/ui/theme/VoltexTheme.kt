package `in`.devlune.voltex.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = VoltexAccent,
    onPrimary = VoltexOnAccent,
    primaryContainer = VoltexAccentSoft,
    onPrimaryContainer = VoltexLink,
    background = VoltexBackground,
    onBackground = VoltexOnBackground,
    surface = VoltexSurface,
    onSurface = VoltexOnSurface,
    surfaceVariant = VoltexBorder,
    onSurfaceVariant = VoltexMuted,
    outline = VoltexBorder,
    secondary = VoltexLink,
    onSecondary = VoltexOnAccent,
)

@Composable
fun VoltexTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content,
    )
}
