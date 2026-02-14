import fs from 'fs/promises';
import path from 'path';
import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, app, dialog, ipcMain, shell, session } from "electron";
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

    /** 本地文件系统：列出目录 */
    ipcMain.handle('fs-readdir', async (e, dirPath: string) => {
        const normalized = path.normalize(dirPath);
        const entries = await fs.readdir(normalized, { withFileTypes: true });
        const list: {
            name: string,
            isDirectory: boolean,
            size?: number,
            mtime?: number
        }[] = [];
        for (let i = 0, len = entries.length; i < len; i++) {
            const entry = entries[i]
            const isDirectory = entry.isDirectory();
            let size = undefined as undefined | number;
            let mtime = undefined as undefined | number;
            if (!isDirectory) {
                try {
                    const stat = await fs.stat(path.join(entry.parentPath, entry.name));
                    size = stat.size;
                    mtime = new Date(stat.mtime).getTime();
                } catch (error) {
                    import.meta.env.DEV && console.error(error)
                }
            }
            list.push({
                name: entry.name,
                isDirectory,
                size,
                mtime
            })
        }
        return list;
    })
    /** 本地：创建目录 */
    ipcMain.handle('fs-mkdir', async (e, dirPath: string) => {
        return fs.mkdir(path.normalize(dirPath), { recursive: true });
    })
    /** 本地：删除文件 */
    ipcMain.handle('fs-unlink', async (e, filePath: string) => {
        return fs.unlink(path.normalize(filePath));
    })
    /** 本地：删除空目录 */
    ipcMain.handle('fs-rmdir', async (e, dirPath: string) => {
        return fs.rmdir(path.normalize(dirPath));
    })
    /** 本地：删除文件或目录（递归） */
    ipcMain.handle('fs-rm', async (e, targetPath: string, options?: { recursive?: boolean }) => {
        return fs.rm(path.normalize(targetPath), { recursive: options?.recursive ?? false });
    })
    /** 本地：重命名/移动 */
    ipcMain.handle('fs-rename', async (e, oldPath: string, newPath: string) => {
        return fs.rename(path.normalize(oldPath), path.normalize(newPath));
    })
    /** 本地：文件信息 */
    ipcMain.handle('fs-stat', async (e, filePath: string) => {
        const info = await fs.stat(path.normalize(filePath));
        return { isDirectory: info.isDirectory(), size: info.size, mtime: info.mtimeMs };
    })

    /** 将文件复制到新的文件夹 */
    ipcMain.handle('fs-copyFile2dir', async (e, oldPath: string, newdir: string) => {
        await fs.mkdir(newdir, { recursive: true });
        const newPath = path.join(newdir, path.basename(oldPath));
        return fs.copyFile(path.normalize(oldPath), path.normalize(newPath));
    })

    ipcMain.handle('app-get-path', (e, name: Parameters<typeof app.getPath>[0]) => app.getPath(name))

    /** Windows 下获取所有逻辑磁盘根路径（如 ['C:\\', 'D:\\']），非 Windows 返回空数组 */
    ipcMain.handle('get-drives', async (): Promise<string[]> => {
        if (process.platform !== 'win32') return [];
        const drives: string[] = [];
        for (let i = 65; i <= 90; i++) {
            const letter = String.fromCharCode(i);
            const root = letter + ':\\';
            try {
                await fs.access(root);
                drives.push(root);
            } catch {
                // 该盘符不存在，跳过
            }
        }
        return drives;
    })

    ipcMain.handle('show-open-dialog', async function (e, option: OpenDialogOptions) {
        return dialog.showOpenDialog({
            ...option,
        }).catch((error) => {
            console.error(error);
        })
    })
    ipcMain.handle('show-save-dialog', async function (e, option: SaveDialogOptions) {
        return dialog.showSaveDialog({
            ...option,
        }).catch((error) => {
            console.error(error);
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
