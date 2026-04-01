// electron/ipc/vault.ts
import { ipcMain, dialog } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import Store from 'electron-store'
import type { RecentVault } from '../types'

const store = new Store<{ recentVaults: RecentVault[] }>({
  defaults: { recentVaults: [] },
})

export function registerVaultHandlers(): void {
  // Show native folder picker
  ipcMain.handle('vault:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Vault Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Create a new vault folder
  ipcMain.handle('vault:create', async (_event, name: string, parentPath: string) => {
    const sanitizedName = name.replace(/[/\\?%*:|"<>]/g, '-')
    const vaultPath = path.join(parentPath, sanitizedName)
    if (!existsSync(vaultPath)) {
      mkdirSync(vaultPath, { recursive: true })
    }
    // Create .trash folder
    mkdirSync(path.join(vaultPath, '.trash'), { recursive: true })
    return vaultPath
  })

  // List recent vaults (sorted newest first)
  ipcMain.handle('vault:list-recent', () => {
    return store.get('recentVaults', []).sort((a: RecentVault, b: RecentVault) => b.lastOpened - a.lastOpened)
  })

  // Save a vault to recent list (upsert by path)
  ipcMain.handle('vault:set-recent', (_event, vaultPath: string) => {
    const existing = store.get('recentVaults', []).filter((v: RecentVault) => v.path !== vaultPath)
    const entry: RecentVault = {
      path: vaultPath,
      name: path.basename(vaultPath),
      lastOpened: Date.now(),
    }
    store.set('recentVaults', [entry, ...existing].slice(0, 10)) // keep 10 max
  })
}
