import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions, contextBridge, ipcRenderer } from 'electron';
import getClient from './preload/ssh2';
import type { InfoEvent, InfoTyoe } from './preload/preload2Render';
import './preload/preload2Render';
import type { OptionsType } from './main/cmd';
import type { ConfigType } from '@/store/useSetting';
import { changeConfig } from './preload/tasks';

const electronAPI = {
    getClient,
    open: (url: string) => ipcRenderer.send('open-url', url),
    /** 通知主线程任务数量 */
    setTaskNum: (num: number) => ipcRenderer.send('task-num', num),
    setCloseWhenTask0: (status: boolean) => ipcRenderer.send('close-windows-when-task-0', status),
    switchLocale: (locale: string) => ipcRenderer.send('switch-locale', locale),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path) as Promise<string>,
    writeFile: (path: string, data: any) => ipcRenderer.invoke('write-file', { path, data }) as Promise<boolean | Error>,
    /** 本地命令行执行代码 */
    execCmd: (command: string, type?: 'powershell' | 'ps1' | 'bat' | 'native', options?: OptionsType) => ipcRenderer.invoke('exec-cmd', command, type, options) as ReturnType<typeof import('./main/cmd').execCmd>,
    /** 打开某个exe，打开某个目录之类的 */
    openExe: (path: string) => ipcRenderer.invoke('open-exe', path) as ReturnType<typeof import('./main/cmd').openExe>,
    showOpenDialog: (option: OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', option) as Promise<Electron.OpenDialogReturnValue>,
    showSaveDialog: (option: SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', option) as Promise<Electron.SaveDialogReturnValue>,
    /** 设置监听信息事件 */
    onInfo: <T extends keyof InfoEvent, S = any>(key: T, callback: (info: InfoTyoe<T, S>) => void) => ipcRenderer.on('emit-info', (_event, value) => key === value.type && callback(value)),
    versions: {
        chrome: process.versions.chrome,
        node: process.versions.node,
        electron: process.versions.electron,
    },
    platform: process.platform,
    /** 在默认浏览器中打开外部链接 */
    openExternal: (url: string, options?: OpenExternalOptions) => ipcRenderer.invoke('open-external', url, options) as Promise<void>,
    /** 修改主题样式 */
    changeThemeSource: (theme: 'dark' | 'light' | 'system') => ipcRenderer.send('change-theme-source', theme),
    /** 修改了配置文件 */
    changeSystemConfig: (config: ConfigType) => changeConfig(config),
    getLocales: (locale?: string) => ipcRenderer.invoke('get-locales', locale) as Promise<{ locale: string, message: Record<string, any> }[]>,
    /** 检查更新 */
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates') as ReturnType<typeof import('./main/updater')['checkForUpdatesAndNotify']>,
    /** 下载更新 */
    downloadUpdate: () => ipcRenderer.invoke('download-update') as ReturnType<typeof import('./main/updater')['downloadUpdate']>,
    /** 重启更新应用 */
    quitAndInstall: () => ipcRenderer.send('quit-and-install-app'),
}
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type electronAPIType = typeof electronAPI;
