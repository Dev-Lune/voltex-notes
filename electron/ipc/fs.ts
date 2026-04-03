// electron/ipc/fs.ts
import { ipcMain, BrowserWindow, dialog } from 'electron'
import { promises as fsp, readdirSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import chokidar, { FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null

/** Reference to the main BrowserWindow (set once via setMainWindow) */
let mainWin: BrowserWindow | null = null

/** Allow main.ts to pass the window reference so watcher events always reach it */
export function setMainWindow(win: BrowserWindow): void {
  mainWin = win
}

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
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      return await fsp.readFile(filePath, 'utf-8')
    } catch {
      return null
    }
  })

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    const dir = path.dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await fsp.writeFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs:list-files', (_event, vaultPath: string) => {
    if (!existsSync(vaultPath)) return []
    return collectMarkdownFiles(vaultPath)
  })

  ipcMain.handle('fs:delete-file', async (_event, filePath: string) => {
    if (!existsSync(filePath)) return
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
    await fsp.rename(filePath, dest)
  })

  ipcMain.handle('fs:rename-file', async (_event, oldPath: string, newPath: string) => {
    const dir = path.dirname(newPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await fsp.rename(oldPath, newPath)
  })

  ipcMain.handle('fs:mkdir', (_event, dirPath: string) => {
    mkdirSync(dirPath, { recursive: true })
  })

  ipcMain.handle('fs:rmdir', async (_event, dirPath: string) => {
    if (existsSync(dirPath)) {
      await fsp.rm(dirPath, { recursive: true, force: true })
    }
  })

  ipcMain.handle('fs:rename-dir', async (_event, oldPath: string, newPath: string) => {
    if (existsSync(oldPath)) {
      await fsp.rename(oldPath, newPath)
    }
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
    watcher.on('change', (changedPath: string) => {
      // Use stored mainWin reference — works even when window is minimized/unfocused
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('fs:file-changed', changedPath)
      }
    })
  })

  // Native "Save File" dialog for exports
  ipcMain.handle(
    'dialog:save-file',
    async (_event, defaultName: string, content: string, filters?: { name: string; extensions: string[] }[]) => {
      const result = await dialog.showSaveDialog({
        title: 'Export File',
        defaultPath: defaultName,
        filters: filters ?? [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (result.canceled || !result.filePath) return false
      await fsp.writeFile(result.filePath, content, 'utf-8')
      return true
    }
  )
}
