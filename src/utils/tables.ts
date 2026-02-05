import { useEnum } from "./hooks";

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

export type ShellsType<T extends 'edit' | 'record' = 'record'> = {
    type: 1 | 2 | 3 | 4,
    key: string,
    baseScripts: {
        key: string, value: string,
        type?: 'powershell' | 'ps1' | 'bat' | 'native',
        env?: T extends 'edit' ? string : Record<string, any>,
        /** 是否合并设置的环境变量 */
        mergeEnv?: boolean
    }[],
    localFile?: string,
    remoteDir?: string,
    /** 忽略规则 */
    exclude?: string,
    /** 组合脚本组 */
    combine?: { value: string, name: string }[],
}[]

/** 脚本表 */
export interface ShellListRecoed<T extends 'edit' | 'record' = 'record'> extends BaseItem {
    id: T extends 'edit' ? (number | null | undefined) : number;
    scriptName: string,
    envVar?: T extends 'edit' ? string : Record<string, any>,
    baseScripts: ShellsType<T>,
    /** 本地目录 */
    localDir?: string,
    /** 远端目录 */
    mainPath?: string,
    group?: string,
    host?: string,
    /** 是否在列表中隐藏数据，默认展示 */
    hidden?: boolean,
}

export function useExcuteListRecoedStatus() {
    return useEnum((t) => ({
        0: t('excuting'),
        1: t('excute-success'),
        2: t('excute-error'),
        3: t('canceling'),
        4: t('canceled'),
    }))
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
    /** 执行脚本时的连接uuid */
    connectId?: string | null,
    /** 执行脚本的群组 */
    excuteGroup?: string,
    /** 执行的脚本分类 */
    excuteType?: 0 | 1 | string,
    /** 执行状态 */
    status: 0 | 1 | 2 | 3 | 4,
    /** 日志 */
    logs?: string,
    /** 已计算的时长 */
    time?: string,
    /** 组合脚本中执行的其他脚本数据 */
    children?: ExcuteListRecoed[],
    /** 只有在作为子记录的时候存在 */
    pid?: string,
}
