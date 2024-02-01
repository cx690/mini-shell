import { ipcMain } from "electron";
import createWindow from "./createwin";
import type { InfoTyoe } from "./preload2Render";
function events() {
    ipcMain.on('open-url', function (e, url: string) {
        return createWindow(url);;
    })

    ipcMain.on('emit-2-render', function (e, data: InfoTyoe) {
        e.sender.send('emit-info', data);
    })
}
export default events;
