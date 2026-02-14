import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { t } from './locales';

function getIconPath(): string {
    const isDev = import.meta.env.DEV;
    const root = app.getAppPath();
    if (isDev) {
        return path.join(root, 'public', 'logo.ico');
    }
    // 打包后 dist 在 app.asar 内，需走 app.asar/dist
    const distDir = app.isPackaged ? path.join('app.asar', 'dist') : 'dist';
    return path.join(root, distDir, 'logo.ico');
}

function createWindow(url?: string) {
    const win = new BrowserWindow({
        title: 'Mini Shell',
        width: 1520,
        height: 800,
        fullscreenable: true,
        icon: getIconPath(),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js'),
        }
    })

    if (url) {
        win.loadURL(url);
    } else {
        // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
        if (process.env.VITE_DEV_SERVER_URL) {
            win.loadURL(process.env.VITE_DEV_SERVER_URL);
        } else {
            // Load your file
            win.loadFile('dist/index.html');
        }
    }

    if (import.meta.env.DEV) {
        win.webContents.openDevTools();
    }

    win.maximize();
    //任务判断
    let confirmd = false;
    let confirming = false;
    win.on('close', async (e) => {
        if (confirmd) return;
        e.preventDefault();
        if (confirming) return;
        const taskNum = await win.webContents.executeJavaScript('window.Excute.getTaskNum();').catch(() => 0);
        if (taskNum === 0) {
            confirmd = true;
            win.close();
        } else {
            confirming = true;
            const { response } = await dialog.showMessageBox({
                type: 'warning',
                message: t('has-task-close-window'),
                buttons: [t('Cancel'), t('Confirm')],
                defaultId: 0,
                cancelId: 0,
            })
            confirming = false;
            if (response === 1) {
                confirmd = true;
                win.close();
            } else {
                confirmd = false;
            }
        }
    })
    return win;
}
export default createWindow;
