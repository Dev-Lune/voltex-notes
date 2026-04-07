// lib/vault/serializer.ts
import type { Note } from '@/components/obsidian/data'
import matter from 'gray-matter'

/** Marker used to store drawingData in the note body instead of frontmatter */
const DRAWING_FENCE_START = '<!-- excalidraw-data'
const DRAWING_FENCE_END = 'excalidraw-data -->'

/** Serialize a Note to markdown string with YAML frontmatter */
export function noteToMarkdown(note: Note): string {
  const frontmatter: Record<string, unknown> = {
    id: note.id,
    title: note.title,
    tags: note.tags,
    folder: note.folder,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    starred: note.starred,
  }
  if (note.pinned !== undefined) frontmatter.pinned = note.pinned
  if (note.trashed) frontmatter.trashed = note.trashed
  if (note.trashedAt) frontmatter.trashedAt = note.trashedAt
  if (note.wordCount !== undefined) frontmatter.wordCount = note.wordCount
  if (note.type && note.type !== 'markdown') frontmatter.type = note.type
  // drawingData is stored in the note body, NOT in frontmatter (L3 fix)
  // versionHistory is intentionally excluded — local-only, same as Firebase

  let body = note.content || ''

  // Append drawingData as a hidden HTML comment block at the end of the body
  if (note.drawingData) {
    body = body + `\n\n${DRAWING_FENCE_START}\n${note.drawingData}\n${DRAWING_FENCE_END}`
  }

  return matter.stringify(body, frontmatter)
}

/** Parse a .md file's raw content + absolute path into a Note */
export function markdownToNote(filePath: string, raw: string): Note {
  let data: Record<string, unknown> = {}
  let content = raw

  try {
    const parsed = matter(raw)
    data = parsed.data as Record<string, unknown>
    content = parsed.content
  } catch {
    // If gray-matter fails, fall back to raw content with no frontmatter
    content = raw
  }

  // Extract drawingData from body (hidden HTML comment block)
  let drawingData: string | undefined = data.drawingData as string | undefined
  const drawingMatch = content.match(
    new RegExp(`${DRAWING_FENCE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)\\n${DRAWING_FENCE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  )
  if (drawingMatch) {
    drawingData = drawingMatch[1]
    // Strip the drawing block from visible content
    content = content.replace(drawingMatch[0], '').trim()
  }

  // Extract filename without extension as fallback title
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  const basename = filePath.slice(lastSep + 1)
  const filename = basename.endsWith('.md') ? basename.slice(0, -3) : basename

  return {
    id: (data.id as string) || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: (data.title as string) || filename,
    content: content.trim(),
    tags: Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? [data.tags] : [],
    folder: (data.folder as string) || 'root',
    createdAt: (data.createdAt as string) || new Date().toISOString(),
    updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    starred: (data.starred as boolean) || false,
    pinned: data.pinned as boolean | undefined,
    trashed: data.trashed as boolean | undefined,
    trashedAt: data.trashedAt as string | undefined,
    wordCount: data.wordCount as number | undefined,
    type: (data.type as Note['type']) || 'markdown',
    drawingData,
    filePath,
  }
}

/** Derive the .md file path from a vault path and a note title */
export function noteFilePath(vaultPath: string, note: Pick<Note, 'title' | 'folder'>): string {
  const folder = note.folder && note.folder !== 'root' ? note.folder : ''
  const filename = `${note.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`
  return folder
    ? `${vaultPath}/${folder}/${filename}`
    : `${vaultPath}/${filename}`
}
