import { BrowserWindow } from "electron";
import path from "path";

function createWindow(url?: string) {
    const win = new BrowserWindow({
        title: '迷你Shell',
        width: 1520,
        height: 800,
        fullscreenable: true,
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

    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    win.maximize();
    return win;
}
export default createWindow;
