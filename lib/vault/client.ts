// lib/vault/client.ts

interface VaultRecentEntry {
  path: string;
  name: string;
  lastOpened: number;
}

interface VaultElectronAPI {
  vault: {
    open: () => Promise<string | null>;
    create: (name: string, parentPath: string) => Promise<string>;
    listRecent: () => Promise<VaultRecentEntry[]>;
    setRecent: (vaultPath: string) => Promise<void>;
    clearRecent: () => Promise<void>;
  };
  fs: {
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    listFiles: (vaultPath: string) => Promise<string[]>;
    deleteFile: (filePath: string) => Promise<void>;
    renameFile: (oldPath: string, newPath: string) => Promise<void>;
    mkdir: (dirPath: string) => Promise<void>;
    rmdir: (dirPath: string) => Promise<void>;
    renameDir: (oldPath: string, newPath: string) => Promise<void>;
    watch: (vaultPath: string) => Promise<void>;
    onFileChanged: (callback: (filePath: string) => void) => () => void;
  };
  dialog: {
    saveFile: (defaultName: string, content: string, filters?: { name: string; extensions: string[] }[]) => Promise<boolean>;
  };
  window: {
    setTitle: (title: string) => Promise<void>;
    setBackgroundColor: (color: string) => Promise<void>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
  };
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
  };
  notify: {
    send: (title: string, body: string) => void;
  };
  updater: {
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onDownloadProgress: (callback: (percent: number) => void) => () => void;
    onUpdateReady: (callback: (version: string) => void) => () => void;
    installUpdate: () => Promise<void>;
  };
  auth: {
    googleSignIn: (clientId: string, clientSecret: string) => Promise<{ idToken: string } | { error: string }>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

/** Typed accessor for the Electron preload bridge */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function api(): VaultElectronAPI {
  return (window as unknown as { electronAPI: VaultElectronAPI }).electronAPI
}

/** True when running inside Electron (preload has injected electronAPI) */
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && 'electronAPI' in window

export const vaultClient = {
  open: (): Promise<string | null> =>
    api().vault.open(),

  create: (name: string, parentPath: string): Promise<string> =>
    api().vault.create(name, parentPath),

  listRecent: () =>
    api().vault.listRecent(),

  setRecent: (vaultPath: string) =>
    api().vault.setRecent(vaultPath),

  clearRecent: () =>
    api().vault.clearRecent(),
}

export const fsClient = {
  readFile: (filePath: string) =>
    api().fs.readFile(filePath),

  writeFile: (filePath: string, content: string) =>
    api().fs.writeFile(filePath, content),

  listFiles: (vaultPath: string) =>
    api().fs.listFiles(vaultPath),

  deleteFile: (filePath: string) =>
    api().fs.deleteFile(filePath),

  renameFile: (oldPath: string, newPath: string) =>
    api().fs.renameFile(oldPath, newPath),

  mkdir: (dirPath: string) =>
    api().fs.mkdir(dirPath),

  rmdir: (dirPath: string) =>
    api().fs.rmdir(dirPath),

  renameDir: (oldPath: string, newPath: string) =>
    api().fs.renameDir(oldPath, newPath),

  watch: (vaultPath: string) =>
    api().fs.watch(vaultPath),

  onFileChanged: (callback: (filePath: string) => void): (() => void) =>
    api().fs.onFileChanged(callback),
}

export const notifyClient = {
  send: (title: string, body: string) =>
    api().notify.send(title, body),
}

export const dialogClient = {
  saveFile: (defaultName: string, content: string, filters?: { name: string; extensions: string[] }[]) =>
    api().dialog.saveFile(defaultName, content, filters),
}

export const windowClient = {
  setTitle: (title: string) =>
    api().window.setTitle(title),
  setBackgroundColor: (color: string) =>
    api().window.setBackgroundColor(color),
}

export const appClient = {
  getVersion: () => api().app.getVersion(),
  getPlatform: () => api().app.getPlatform(),
}

export const storeClient = {
  get: (key: string) => api().store.get(key),
  set: (key: string, value: unknown) => api().store.set(key, value),
}

export const updaterClient = {
  onUpdateAvailable: (cb: (version: string) => void) => api().updater.onUpdateAvailable(cb),
  onDownloadProgress: (cb: (percent: number) => void) => api().updater.onDownloadProgress(cb),
  onUpdateReady: (cb: (version: string) => void) => api().updater.onUpdateReady(cb),
  installUpdate: () => api().updater.installUpdate(),
}

export const electronOn = (channel: string, callback: (...args: unknown[]) => void) =>
  api().on(channel, callback)

export const authClient = {
  googleSignIn: (clientId: string, clientSecret: string) =>
    api().auth.googleSignIn(clientId, clientSecret),
}
