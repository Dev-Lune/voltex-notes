package `in`.devlune.voltex.domain.model

enum class NoteType(val value: String) {
    MARKDOWN("markdown"),
    DRAWING("drawing"),
    DAILY("daily"),
    KANBAN("kanban"),
    CANVAS("canvas");

    companion object {
        fun fromValue(value: String): NoteType =
            entries.firstOrNull { it.value == value } ?: MARKDOWN
    }
}
