import { ipcRenderer } from "electron";

export interface InfoEvent {
    'upload': UploadInfoType,
    'close-windows': boolean
}

// enum statusInfo {
//     '准备上传,队列中',
//     '上传中',
//     '上传完成',
//     '上传失败'
// }

export interface UploadInfoType {
    status: 0 | 1 | 2 | 3,
    message?: string,
    /** 已上传 */
    successNum: number,
    /** 已失败 */
    errorNum: number;
    /** 总共上传的 */
    total: number;
    /** 上传的名称一般是脚本名称 */
    name?: string;
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
