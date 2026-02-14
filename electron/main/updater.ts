import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { InfoTyoe } from "../preload/preload2Render";

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
    sendStatusToWindow({
        type: 'update-downloaded',
        uuid: 'update-downloaded',
        data: UpdateDownloadedEvent
    })
});

export function quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
}