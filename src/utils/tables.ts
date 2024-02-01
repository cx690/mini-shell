interface BaseItem {
    /** 新增时候无需提供此键 */
    id?: number | null;
    /** 即使导出和导入也不会变化的id */
    uuid: string,
}
/** 会话连接表 */
export interface ServerListRecord extends BaseItem {
    /** 名称 */
    name?: string,
    /** 主机 */
    host: string,
    /** 端口 */
    port: number,
    /** 用户名 */
    username: string,
    /** 密码 */
    password: string,
    /** 说明 */
    desc?: string,
}
export type ShellsType = {
    type: 1 | 2 | 3,
    key: string,
    baseScripts: { key: string, value: string, type?: 'powershell' | 'bat' | 'native', }[],
    localFile?: string,
    remoteDir?: string,
}[]

/** 脚本表 */
export interface ShellListRecoed extends BaseItem {
    scriptName: string,
    envVar: Record<string, any>,
    baseScripts: ShellsType,
    /** 本地目录 */
    localDir?: string,
    /** 远端目录 */
    mainPath?: string,
    group?: string,
    host?: string,
}

export enum ExcuteListRecoedStatus {
    "执行中",
    "执行完毕",
    "执行错误",
    "取消中",
    "已取消",
}
/** 执行记录表 */
export interface ExcuteListRecoed extends BaseItem {
    /** 执行的脚本名称 */
    shellName: string,
    /** 执行的脚本host */
    host: string,
    /** 开始时间 */
    startTime: string,
    /** 结束时间 */
    endTime?: string,
    /** 执行的脚本uuid */
    excuteId?: string,
    /** 执行脚本的群组 */
    excuteGroup?: string,
    /** 执行的脚本分类 */
    excuteType?: 0 | 1 | string;
    /** 执行状态 */
    status: 0 | 1 | 2 | 3 | 4,
    /** 日志 */
    logs?: string;
    /** 已计算的时长 */
    time?: string;
}