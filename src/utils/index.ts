import dayjs from "dayjs";
import { ShellsType } from "./tables";
import duration from 'dayjs/plugin/duration';
import { ElMessage } from "element-plus";
import type { SaveDialogOptions } from "electron";
import { useEnum } from "./hooks";

dayjs.extend(duration);

export const defaultEnv = {
    NOW_TIME: "YYYY-MM-DD~HH:mm:ss",
}
export function formatterShell(config: Record<string, any>, shell: string): string;
export function formatterShell(config: Record<string, any>, shell: string[]): string[];
export function formatterShell<T extends string | string[]>(config: Record<string, any>, shell: T): T {
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
    }))
}

export function formatScriptStr(config: Record<string, any>, shells: ShellsType<'edit'> | ShellsType<'record'>, t: (...args: any) => string) {
    let str = t('excute-script-list') + '\n';
    const shellTypeEnum = {
        1: t('remote-script'),
        2: t('local-script'),
        3: t('upload-script'),
    };
    for (const item of shells) {
        const { type } = item;
        str += `${shellTypeEnum[type]}：\n`;
        if (type !== 3 && item.baseScripts) {
            for (let i = 0, l = item.baseScripts.length; i < l; i++) {
                const { value, env } = item.baseScripts[i];
                str += t('script-num', { num: i + 1 }) + `\n`;
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
        } else {
            str += `${t('upload-file-path')}：${formatterShell(config, item.localFile ?? '')}\n${t('remote-path-dir')}：${formatterShell(config, item.remoteDir ?? '')}\n`;
        }
    }
    return str;
}

export function formatEnv(config: Record<string, any>, env?: null | Record<string, any>) {
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
    format = format ?? (localStorage.locale === 'en' ? 'H:mm:ss' : 'H时mm分ss秒');
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    // 计算时间差
    const diff = end.diff(start);
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format);
}

/** 计算一天之内的时间差 */
export function utilTime(startTime: string, format?: string) {
    format = format ?? (localStorage.locale === 'en' ? 'H:mm:ss' : 'H时mm分ss秒');
    const start = dayjs(startTime);
    const end = dayjs();
    // 计算时间差
    const diff = end.diff(start);
    if (diff >= 24 * 60 * 60 * 1000) {
        return startTime;
    }
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format) + (localStorage.locale === 'en' ? ' ago' : '前');
}

/**
 * 导出数据到文件
 * @param text 要导出的数据
 * @param option 保存文件夹的选项
 */
export async function exportData(text: any, option?: SaveDialogOptions, t?: ReturnType<typeof import('vue-i18n').useI18n>['t']) {
    if (text == null) {
        ElMessage.warning(t ? t('no-data-export') : 'No data found to export!');
        return;
    }
    const res = await electronAPI.showSaveDialog({
        title: t ? t('select-save') : 'Select save location',
        defaultPath: 'config',
        filters: [{ extensions: ['json'], name: '' }],
        ...option,
    })
    if (!res.canceled && res.filePath) {
        const status = await electronAPI.writeFile(res.filePath, text);
        if (status === true) {
            ElMessage.success(t ? t('file-save-success', { filePath: res.filePath }) : `File saved to ${res.filePath}`);
        } else {
            ElMessage.error(t ? t('file-save-error', { err: status + '' }) : `File save failed, reson: ${status}`);
        }
        return status;
    }
    return false;
}
