// Global type declarations for Electron API (injected via preload context bridge)

interface ElectronRecentVault {
  path: string;
  name: string;
  lastOpened: number;
}

interface ElectronAPI {
  vault: {
    open: () => Promise<string | null>;
    create: (name: string, parentPath: string) => Promise<string>;
    listRecent: () => Promise<ElectronRecentVault[]>;
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
  updater: {
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onDownloadProgress: (callback: (percent: number) => void) => () => void;
    onUpdateReady: (callback: (version: string) => void) => () => void;
    installUpdate: () => Promise<void>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
