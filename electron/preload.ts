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
    mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
    rmdir: (dirPath: string) => ipcRenderer.invoke('fs:rmdir', dirPath),
    renameDir: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename-dir', oldPath, newPath),
    watch: (vaultPath: string) => ipcRenderer.invoke('fs:watch', vaultPath),
    onFileChanged: (callback: (filePath: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
      ipcRenderer.on('fs:file-changed', handler)
      return () => ipcRenderer.removeListener('fs:file-changed', handler)
    },
  },
  dialog: {
    saveFile: (defaultName: string, content: string, filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:save-file', defaultName, content, filters),
  },
  window: {
    setTitle: (title: string) => ipcRenderer.invoke('window:set-title', title),
    setBackgroundColor: (color: string) => ipcRenderer.invoke('window:set-background-color', color),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
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
  auth: {
    googleSignIn: (clientId: string, clientSecret: string) =>
      ipcRenderer.invoke('auth:google-sign-in', clientId, clientSecret),
  },
  // Event listeners for tray/menu IPC from main process
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'tray:new-note',
      'menu:open-settings',
      'menu:open-vault',
      'menu:toggle-sidebar',
      'menu:toggle-right-panel',
      'deep-link',
      'open-file',
    ]
    if (validChannels.includes(channel)) {
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
    return () => {}
  },
})
