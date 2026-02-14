import { ipcMain, BrowserWindow, dialog, nativeTheme, app } from "electron";
import { exec } from 'child_process';
import createWindow from "./createwin";
import type { InfoTyoe } from "../preload/preload2Render";
import { setApplicationMenu } from "./menu";
import { quitAndInstall } from "./updater";

let close = false;

function events() {
    ipcMain.on('open-url', function (e, url: string) {
        return createWindow(url);;
    })

    ipcMain.on('emit-2-render', function (e, data: InfoTyoe) {
        e.sender.send('emit-info', data);
    })

    ipcMain.on('task-num', function (e, num: number) {
        num === 0 && checkTask();
    })

    ipcMain.on('close-windows-when-task-0', function (e, status: boolean) {
        const wins = BrowserWindow.getAllWindows();
        close = status;
        for (const item of wins) {
            item.webContents.send('emit-info', {
                type: 'close-windows',
                uuid: '',
                data: status,
            })
        }
        checkTask();
    })

    ipcMain.on('switch-locale', function (e, locale?: string) {
        setApplicationMenu(locale);
    })

    ipcMain.on('change-theme-source', function (e, theme: 'dark' | 'light' | 'system') {
        nativeTheme.themeSource = theme;
    })

    ipcMain.on('quit-and-install-app', function () {
        if (!import.meta.env.DEV) {
            quitAndInstall();
        }
    })

    /** 重启当前应用 */
    ipcMain.on('restart-app', function () {
        app.relaunch();
        app.exit(0);
    })
}
export default events;

async function checkTask() {
    if (close) {
        const wins = BrowserWindow.getAllWindows();
        const arr = await Promise.all(wins.map(({ webContents }) => webContents.executeJavaScript('window.Excute.getTaskNum();').catch(() => 0)));
        const taskNum: number = arr.reduce((a, b) => a + b);
        if (taskNum === 0) {
            for (const win of wins) {
                win.webContents.send('emit-info', {
                    type: 'close-windows',
                    uuid: '',
                    data: false,
                })
            }
            close = false;
            exec('shutdown -s -t 15', (err) => {
                if (err) {
                    dialog.showMessageBox({
                        title: '关闭计算机错误',
                        message: err + '',
                        type: 'error'
                    })
                }
            })
        }
    }
}
