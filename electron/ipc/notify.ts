// electron/ipc/notify.ts
import { ipcMain, Notification } from 'electron'

export function registerNotifyHandlers(): void {
  ipcMain.handle('notify:send', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })
}
