package `in`.devlune.voltex.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import `in`.devlune.voltex.ui.auth.AuthScreen
import `in`.devlune.voltex.ui.auth.AuthViewModel
import `in`.devlune.voltex.ui.editor.EditorScreen
import `in`.devlune.voltex.ui.home.HomeScreen
import `in`.devlune.voltex.ui.search.SearchScreen

sealed class Route(val path: String) {
    data object Auth : Route("auth")
    data object Home : Route("home")
    data object Search : Route("search")
    data object Editor : Route("editor/{noteId}") {
        fun withId(id: String) = "editor/$id"
        fun newNote() = "editor/new"
    }
}

@Composable
fun VoltexNavGraph() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val currentUser by authViewModel.currentUser.collectAsState()

    val startDestination = if (currentUser != null) Route.Home.path else Route.Auth.path

    NavHost(navController = navController, startDestination = startDestination) {

        composable(Route.Auth.path) {
            AuthScreen(
                onAuthenticated = {
                    navController.navigate(Route.Home.path) {
                        popUpTo(Route.Auth.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Home.path) {
            HomeScreen(
                onNoteClick = { noteId -> navController.navigate(Route.Editor.withId(noteId)) },
                onNewNote = { navController.navigate(Route.Editor.newNote()) },
                onSearchClick = { navController.navigate(Route.Search.path) },
                onSignOut = {
                    navController.navigate(Route.Auth.path) {
                        popUpTo(Route.Home.path) { inclusive = true }
                    }
                },
            )
        }

        composable(Route.Search.path) {
            SearchScreen(
                onNoteClick = { noteId -> navController.navigate(Route.Editor.withId(noteId)) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Route.Editor.path,
            arguments = listOf(navArgument("noteId") { type = NavType.StringType }),
        ) { backStack ->
            val noteId = backStack.arguments?.getString("noteId") ?: "new"
            EditorScreen(
                noteId = noteId.takeIf { it != "new" },
                onBack = { navController.popBackStack() },
            )
        }
    }
}
