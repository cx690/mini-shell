import fs from 'fs/promises';
import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, dialog, ipcMain, shell } from "electron";
import { openExe, execCmd } from './cmd';
import getLocales from './locales';
import { checkForUpdatesAndNotify, downloadUpdate } from './updater';
export function handles() {
    ipcMain.handle('exec-cmd', async function (e, command: string, type?: 'powershell' | 'bat' | 'native', env?: Record<string, any>) {
        return await execCmd(command, type, env);
    })
    ipcMain.handle('open-exe', async function (e, command: string) {
        return await openExe(command);
    })
    ipcMain.handle('open-external', async function (e, url: string, options?: OpenExternalOptions) {
        return await shell.openExternal(url, options);
    })
    ipcMain.handle('read-file', function (e, path: string) {
        return fs.readFile(path, 'utf8');
    })
    ipcMain.handle('write-file', async function (e, { path, data }) {
        // 支持 ArrayBuffer（Zmodem 二进制下载）
        const buf = data instanceof ArrayBuffer ? Buffer.from(data) : data;
        return fs.writeFile(path, buf).then(() => true).catch((err) => err);
    })
    ipcMain.handle('show-open-dialog', async function (e, option: OpenDialogOptions) {
        return dialog.showOpenDialog({
            ...option,
        }).catch((error) => {
            console.log(error);
        })
    })
    ipcMain.handle('show-save-dialog', async function (e, option: SaveDialogOptions) {
        return dialog.showSaveDialog({
            ...option,
        }).catch((error) => {
            console.log(error);
        })
    })
    ipcMain.handle('get-locales', async function (e, locale?: string) {
        return getLocales(locale);
    })


    /** 检查更新 */
    ipcMain.handle('check-for-updates', () => {
        return checkForUpdatesAndNotify();
    })
    /** 检查更新 */
    ipcMain.handle('download-update', () => {
        return downloadUpdate();
    })
}
