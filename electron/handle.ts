import fs from 'fs/promises';
import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, dialog, ipcMain, shell } from "electron";
import { openExe, execCmd } from './cmd';
import getLocales from './locales';
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
        return fs.writeFile(path, data).then(() => true).catch((err) => err);
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
}
