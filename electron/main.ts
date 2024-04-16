import { app, BrowserWindow } from 'electron';
import createWindow from './createwin';
import events from './on';
import { handles } from './handle';
import './menu';

if (process.env.NODE_ENV === 'development') {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();//始终阻止第二实例
    process.env.NODE_ENV !== 'production' && console.log(`\x1B[33mCan't create second instance! Please exit this instance and try again.\x1B[0m`);
} else {
    app.on('second-instance', () => {
        // 有人试图运行第二个实例，实例中的浏览器不可以对相同的indexDB中数据库进行操作
        createWindow();
    })

    app.whenReady().then(() => {
        events();
        handles();
        createWindow();
        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    })

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    })
}
