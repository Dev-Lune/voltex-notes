// electron/ipc/fs.ts
import { ipcMain, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import chokidar, { FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null

/** Recursively collect all .md file paths under a directory */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // skip .trash, .git, hidden
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

export function registerFsHandlers(): void {
  ipcMain.handle('fs:read-file', (_event, filePath: string) => {
    return readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('fs:write-file', (_event, filePath: string, content: string) => {
    const dir = path.dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs:list-files', (_event, vaultPath: string) => {
    if (!existsSync(vaultPath)) return []
    return collectMarkdownFiles(vaultPath)
  })

  ipcMain.handle('fs:delete-file', (_event, filePath: string) => {
    // Move to .trash folder inside vault root
    let current = path.dirname(filePath)
    let trashDir = path.join(current, '.trash')

    // Traverse up to find vault root (has .trash at top level)
    while (current !== path.dirname(current)) {
      const candidate = path.join(current, '.trash')
      if (existsSync(candidate)) {
        trashDir = candidate
        break
      }
      current = path.dirname(current)
    }

    if (!existsSync(trashDir)) mkdirSync(trashDir, { recursive: true })
    const dest = path.join(trashDir, path.basename(filePath))
    renameSync(filePath, dest)
  })

  ipcMain.handle('fs:rename-file', (_event, oldPath: string, newPath: string) => {
    const dir = path.dirname(newPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    renameSync(oldPath, newPath)
  })

  // Start watching vault folder; sends 'fs:file-changed' to renderer on changes
  ipcMain.handle('fs:watch', (_event, vaultPath: string) => {
    if (watcher) watcher.close()
    watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[/\\])\../, // ignore hidden files
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    })
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    watcher.on('change', (changedPath: string) => {
      win.webContents.send('fs:file-changed', changedPath)
    })
  })
}
