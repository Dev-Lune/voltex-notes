// lib/vault/serializer.ts
import type { Note } from '@/components/obsidian/data'

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
  if (note.drawingData) frontmatter.drawingData = note.drawingData
  // versionHistory is intentionally excluded — local-only, same as Firebase

  // Build YAML frontmatter manually (avoid gray-matter dependency in renderer)
  const lines = ['---']
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`)
      } else {
        lines.push(`${key}:`)
        for (const item of value) {
          lines.push(`  - ${JSON.stringify(item)}`)
        }
      }
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${JSON.stringify(value)}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push('---')
  lines.push('')

  return lines.join('\n') + (note.content || '')
}

/** Parse a .md file's raw content + absolute path into a Note */
export function markdownToNote(filePath: string, raw: string): Note {
  let data: Record<string, unknown> = {}
  let content = raw

  // Parse YAML frontmatter manually (avoid gray-matter in renderer bundle)
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (fmMatch) {
    content = raw.slice(fmMatch[0].length)
    const yamlBlock = fmMatch[1]
    // Simple YAML parser for flat key-value + arrays
    let currentKey = ''
    const arrayValues: string[] = []

    for (const line of yamlBlock.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Array item
      if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim()
        try {
          arrayValues.push(JSON.parse(val))
        } catch {
          arrayValues.push(val)
        }
        continue
      }

      // Flush previous array
      if (currentKey && arrayValues.length > 0) {
        data[currentKey] = [...arrayValues]
        arrayValues.length = 0
      }

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim()
      const valRaw = line.slice(colonIdx + 1).trim()

      if (valRaw === '' || valRaw === undefined) {
        // Start of array or empty value
        currentKey = key
        continue
      }

      if (valRaw === '[]') {
        data[key] = []
      } else if (valRaw === 'true') {
        data[key] = true
      } else if (valRaw === 'false') {
        data[key] = false
      } else if (valRaw === 'undefined' || valRaw === 'null') {
        data[key] = undefined
      } else if (!isNaN(Number(valRaw)) && valRaw !== '') {
        data[key] = Number(valRaw)
      } else {
        try {
          data[key] = JSON.parse(valRaw)
        } catch {
          data[key] = valRaw
        }
      }
      currentKey = key
    }
    // Flush final array
    if (currentKey && arrayValues.length > 0) {
      data[currentKey] = [...arrayValues]
    }
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
    drawingData: data.drawingData as string | undefined,
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
