import { ipcRenderer } from "electron";
import { ProgressInfo, UpdateDownloadedEvent } from "electron-updater";

export interface InfoEvent {
    'upload': UploadInfoType,
    'close-windows': boolean,
    'download-progress': ProgressInfo,
    'update-downloaded': UpdateDownloadedEvent,
}

// enum statusInfo {
//     '准备上传,队列中',
//     '传输中',
//     '传输完成',
//     '传输失败'
//     '正在发现远程文件',
// }

/** 传输信息类型 */
export interface UploadInfoType {
    status: 0 | 1 | 2 | 3 | 4,
    /** 传输类型，默认上传 */
    transferType?: 'upload' | 'download',
    message?: string,
    /** 已上传 */
    successNum: number,
    /** 已失败 */
    errorNum: number;
    /** 总共上传的 */
    total: number;
    /** 上传的名称一般是脚本名称 */
    name?: string;
    /** 文件大小或者数量 */
    type?: 'fileSize' | 'fileNumber';
}

export type InfoTyoe<T extends keyof InfoEvent = 'upload', S = InfoEvent[T]> = {
    type: T,
    uuid: string,
    data?: S,
}
/** 将消息通过主进程代理，发送给浏览器渲染器进程 */
function preload2Render<T extends keyof InfoEvent>(info: InfoTyoe<T>) {
    return ipcRenderer.send('emit-2-render', info);
}

export default preload2Render;
