// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  vault: {
    open: () => ipcRenderer.invoke('vault:open'),
    create: (name: string, parentPath: string) =>
      ipcRenderer.invoke('vault:create', name, parentPath),
    listRecent: () => ipcRenderer.invoke('vault:list-recent'),
    setRecent: (vaultPath: string) => ipcRenderer.invoke('vault:set-recent', vaultPath),
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', filePath, content),
    listFiles: (vaultPath: string) => ipcRenderer.invoke('fs:list-files', vaultPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete-file', filePath),
    renameFile: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('fs:rename-file', oldPath, newPath),
    onFileChanged: (callback: (filePath: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
      ipcRenderer.on('fs:file-changed', handler)
      // Return cleanup function
      return () => ipcRenderer.removeListener('fs:file-changed', handler)
    },
  },
  notify: {
    send: (title: string, body: string) => ipcRenderer.invoke('notify:send', title, body),
  },
  updater: {
    onUpdateAvailable: (callback: (version: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, version: string) => callback(version)
      ipcRenderer.on('updater:update-available', handler)
      return () => ipcRenderer.removeListener('updater:update-available', handler)
    },
    onDownloadProgress: (callback: (percent: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, percent: number) => callback(percent)
      ipcRenderer.on('updater:download-progress', handler)
      return () => ipcRenderer.removeListener('updater:download-progress', handler)
    },
    onUpdateReady: (callback: (version: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, version: string) => callback(version)
      ipcRenderer.on('updater:update-ready', handler)
      return () => ipcRenderer.removeListener('updater:update-ready', handler)
    },
    installUpdate: () => ipcRenderer.invoke('updater:install'),
  },
})
