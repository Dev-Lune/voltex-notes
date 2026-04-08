// electron/types.d.ts

export interface RecentVault {
  path: string;
  name: string;
  lastOpened: number;
}

export interface ElectronAPI {
  vault: {
    open: () => Promise<string | null>;
    create: (name: string, parentPath: string) => Promise<string>;
    listRecent: () => Promise<RecentVault[]>;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
