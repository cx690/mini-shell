import fs from 'fs/promises';
import path from 'path';
import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, dialog, ipcMain, shell, session } from "electron";
import { openExe, execCmd } from './cmd';
import getLocales from './locales';
import { checkForUpdatesAndNotify, downloadUpdate } from './updater';

/** 每个窗口的 Zmodem 下载目录（webContentsId -> dir） */
const zmodemDownloadDirs = new Map<number, string>();

/** 获取不重复的文件路径（文件已存在时按浏览器风格重命名） */
async function getUniqueFilePath(filePath: string): Promise<string> {
    const normalized = path.normalize(filePath);
    try {
        await fs.access(normalized);
    } catch {
        return normalized;
    }
    const dir = path.dirname(normalized);
    const fullName = path.basename(normalized);
    const lastDot = fullName.lastIndexOf('.');
    let base = lastDot >= 0 ? fullName.substring(0, lastDot) : fullName;
    const ext = lastDot >= 0 ? fullName.substring(lastDot) : '';
    const match = base.match(/^(.+)\s\((\d+)\)$/);
    let counter = match ? parseInt(match[2], 10) + 1 : 1;
    base = match ? match[1] : base;
    do {
        const candidate = path.join(dir, `${base} (${counter})${ext}`);
        try {
            await fs.access(candidate);
            counter++;
        } catch {
            return candidate;
        }
    } while (true);
}

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
    ipcMain.handle('get-unique-file-path', (e, filePath: string) => getUniqueFilePath(filePath))
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


    ipcMain.on('set-zmodem-download-dir', (e, dir: string) => {
        if (dir && e.sender) {
            const id = e.sender.id;
            zmodemDownloadDirs.set(id, dir);
            e.sender.once('destroyed', () => zmodemDownloadDirs.delete(id));
        }
    })

    session.defaultSession.on('will-download', async (event, item, webContents) => {
        const dir = zmodemDownloadDirs.get(webContents.id);
        if (!dir) return;
        const filename = item.getFilename();
        if (!filename) return;
        const savePath = await getUniqueFilePath(path.join(dir, filename));
        item.setSavePath(savePath);
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
