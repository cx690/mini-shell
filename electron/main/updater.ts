import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { InfoTyoe } from "../preload/preload2Render";
import { copy } from './utils';
import { backupDirectory, langDir } from './config';

export async function checkForUpdatesAndNotify() {
    autoUpdater.autoDownload = false;
    return autoUpdater.checkForUpdatesAndNotify();
}

export async function downloadUpdate() {
    return autoUpdater.downloadUpdate();
}

function sendStatusToWindow(data: InfoTyoe<'download-progress' | 'update-downloaded'>) {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
        win.webContents.send('emit-info', data);
    }
}

autoUpdater.on('download-progress', (ProgressInfo) => {
    sendStatusToWindow({
        type: 'download-progress',
        uuid: 'download-progress',
        data: ProgressInfo
    })
})

autoUpdater.on('update-downloaded', async (UpdateDownloadedEvent) => {
    if (!import.meta.env.DEV && process.platform === 'win32') {
        await copy(langDir, backupDirectory, { createRootDir: true, force: true });//尝试备份用户可能存在的自定义语言
    }
    sendStatusToWindow({
        type: 'update-downloaded',
        uuid: 'update-downloaded',
        data: UpdateDownloadedEvent
    })
});

export function quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
}