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
  };
  fs: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    listFiles: (vaultPath: string) => Promise<string[]>;
    deleteFile: (filePath: string) => Promise<void>;
    renameFile: (oldPath: string, newPath: string) => Promise<void>;
    onFileChanged: (callback: (filePath: string) => void) => () => void;
  };
  notify: {
    send: (title: string, body: string) => void;
  };
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

  onFileChanged: (callback: (filePath: string) => void): (() => void) =>
    api().fs.onFileChanged(callback),
}

export const notifyClient = {
  send: (title: string, body: string) =>
    api().notify.send(title, body),
}
