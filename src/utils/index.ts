import dayjs from "dayjs";
import { ShellsType } from "./tables";
import duration from 'dayjs/plugin/duration';
import { ElMessage } from "element-plus";
import type { SaveDialogOptions } from "electron";
import { useEnum } from "./hooks";
import { t } from '@/i18n';

dayjs.extend(duration);

export const defaultEnv = {
    NOW_TIME: "YYYY-MM-DD~HH:mm:ss",
}
export function formatterShell(config: Record<string, any> | undefined | null, shell: string): string;
export function formatterShell(config: Record<string, any> | undefined | null, shell: string[]): string[];
export function formatterShell<T extends string | string[]>(config: Record<string, any> | undefined | null, shell: T): T {
    config = { ...defaultEnv, ...config };
    config.NOW_TIME = dayjs().format(config.NOW_TIME);
    if (Array.isArray(shell)) {
        return shell.map(str => {
            for (const key in config) {
                str = str.replaceAll(new RegExp(`\{${key}\}`, 'g'), config[key]);
            }
            return str;
        }) as T
    }
    let str = shell as string;
    for (const key in config) {
        str = str.replaceAll(new RegExp(`\{${key}\}`, 'g'), config[key]);
    }
    return str as T;
}

export function useShellTypeEnum() {
    return useEnum((t) => ({
        1: t('remote-script'),
        2: t('local-script'),
        3: t('upload-script'),
        4: t('combined-script'),
    }))
}

export function formatScriptStr(config: Record<string, any> | undefined | null, shells: ShellsType<'edit'> | ShellsType<'record'>) {
    config = config || {};
    let str = t('excute-script-list') + '\n';
    const shellTypeEnum = {
        1: t('remote-script'),
        2: t('local-script'),
        3: t('upload-script'),
        4: t('combined-script'),
    };
    for (const item of shells) {
        const { type } = item;
        str += `${shellTypeEnum[type]}：\n`;
        if ((type === 1 || type === 2) && item.baseScripts) {
            for (let i = 0, l = item.baseScripts.length; i < l; i++) {
                const { value, env, type: localType } = item.baseScripts[i];
                str += t('script-num', { num: i + 1 }) + (type === 2 ? `(${electronAPI.platform === 'win32' ? (localType ?? 'powershell') : (localType ?? 'native')})\n` : '\n');
                if (type === 2 && env) {
                    if (typeof env === 'string') {
                        str += `${t('env-var')}：\n${env}\n`;
                    } else {
                        const formatEnvObj = formatEnv(config, env);
                        if (formatEnvObj) {
                            str += `${t('env-var')}：\n${JSON.stringify(formatEnvObj)}\n`;
                        }
                    }
                }
                str += `${formatterShell(config, value)}\n`;
            }
        } else if (type === 3) {
            str += `${t('upload-file-path')}：${formatterShell(config, item.localFile ?? '')}\n${t('remote-path-dir')}：${formatterShell(config, item.remoteDir ?? '')}\n${item.exclude ? `${t('ignore-rules')}: ${formatterShell(config, item.exclude)}\n` : ''}`;
        } else if (type === 4) {
            str += item.combine?.map(item => `${t('script-name')}:${item.name} ${t('Sign')}:${item.value} `)?.join('\n') || '';
            str += '\n';
        }
    }
    return str;
}

export function formatEnv(config: Record<string, any> | null | undefined, env?: null | Record<string, any>) {
    if (env && typeof env === 'object') {
        const obj: Record<string, any> = {};
        for (const key in env) {
            const value = env[key];
            if (typeof value === 'string' && value) {
                obj[key] = formatterShell(config, value);
            } else {
                obj[key] = value;
            }
        }
        return obj;
    }
}

/** 一段时间只保留最后一次触发 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 500) {
    let timer: any = 0;
    return function (this: any, ...args: any[]) {
        if (timer) {
            clearTimeout(timer);
        };
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = 0;
        }, delay)
    } as T;
}

/** 按照某个字段去重 */
export function noRepeat<T extends Record<string, any>>(list: T[], key = 'value'): T[] {
    const arr: T[] = [];
    const incules: any[] = [];
    for (const item of list) {
        if (!incules.includes(item[key])) {
            arr.push(item);
            incules.push(item[key]);
        }
    }
    return arr;
}

export function computedTime(startTime: string | dayjs.Dayjs, endTime?: string | dayjs.Dayjs, format?: string) {
    format = format ?? (t('format-time1'));
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    // 计算时间差
    const diff = end.diff(start);
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format);
}

/** 计算一天之内的时间差 */
export function utilTime(startTime: string, format?: string) {
    format = format ?? (t('format-time1'));
    const start = dayjs(startTime);
    const end = dayjs();
    // 计算时间差
    const diff = end.diff(start);
    if (diff >= 24 * 60 * 60 * 1000) {
        return startTime;
    }
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format) + (t('ago'));
}

/**
 * 导出数据到文件
 * @param text 要导出的数据
 * @param option 保存文件夹的选项
 */
export async function exportData(text: any, option?: SaveDialogOptions) {
    if (text == null) {
        ElMessage.warning(t('no-data-export'));
        return;
    }
    const res = await electronAPI.showSaveDialog({
        title: t('select-save'),
        defaultPath: 'config',
        filters: [{ extensions: ['json'], name: '' }],
        ...option,
    })
    if (!res.canceled && res.filePath) {
        const status = await electronAPI.writeFile(res.filePath, text);
        if (status === true) {
            ElMessage.success(t('file-save-success', { filePath: res.filePath }));
        } else {
            ElMessage.error(t('file-save-error', { err: status + '' }));
        }
        return status;
    }
    return false;
}

export function Content(props: any, ctx: any) {//ElNotification.message不是可以添加未依赖的函数，所以添加一个default插槽函数，这样可以跟踪数据变化，自动刷新
    return ctx.slots?.default?.();
}

/**
 * 格式化文件大小，单位字节
 * @param size 文件大小，单位字节
 * @returns 格式化后的文件大小字符串
 */
export function formatSize(size?: number | string) {
    if (typeof size === 'string') size = Number(size);
    if (!size || size <= 0 || !isFinite(size) || isNaN(size)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${parseFloat(size.toFixed(1))} ${units[index]}`;
}
