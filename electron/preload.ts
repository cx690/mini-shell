import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, contextBridge, ipcRenderer } from 'electron';
import getClient from './ssh2';
import type { InfoEvent, InfoTyoe } from './preload2Render';
import './preload2Render';
const electronAPI = {
    getClient,
    open: (url: string) => ipcRenderer.send('open-url', url),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path) as Promise<string>,
    writeFile: (path: string, data: any) => ipcRenderer.invoke('write-file', { path, data }) as Promise<boolean>,
    /** 在powershell中执行代码 */
    execCmd: (command: string, type?: 'powershell' | 'bat' | 'native') => ipcRenderer.invoke('exec-cmd', command, type) as ReturnType<typeof import('./cmd').execCmd>,
    /** 打开某个exe，打开某个目录之类的 */
    openExe: (path: string) => ipcRenderer.invoke('open-exe', path) as ReturnType<typeof import('./cmd').openExe>,
    showOpenDialog: (option: OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', option) as Promise<Electron.OpenDialogReturnValue>,
    showSaveDialog: (option: SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', option) as Promise<Electron.SaveDialogReturnValue>,
    /** 设置监听信息事件 */
    onInfo: <T extends keyof InfoEvent, S = any>(callback: (info: InfoTyoe<T, S>) => void) => ipcRenderer.on('emit-info', (_event, value) => callback(value)),
    versions: {
        chrome: process.versions.chrome,
        node: process.versions.node,
        electron: process.versions.electron,
    },
    /** 在默认浏览器中打开外部链接 */
    openExternal: (url: string, options?: OpenExternalOptions) => ipcRenderer.invoke('open-external', url, options) as Promise<void>,
}
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type electronAPIType = typeof electronAPI;
