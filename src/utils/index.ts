import dayjs from "dayjs";
import { ShellsType } from "./tables";
import duration from 'dayjs/plugin/duration';
import { ElMessage } from "element-plus";
import type { SaveDialogOptions } from "electron";

dayjs.extend(duration);

export const defaultEnv = {
    NOW_TIME: "YYYY-MM-DD~HH:mm:ss",
}
export function formatterShell(environment: Record<string, any>, shell: string): string;
export function formatterShell(environment: Record<string, any>, shell: string[]): string[];
export function formatterShell<T extends string | string[]>(environment: Record<string, any>, shell: T): T {
    environment = { ...defaultEnv, ...environment };
    environment.NOW_TIME = dayjs().format(environment.NOW_TIME);
    if (Array.isArray(shell)) {
        return shell.map(str => {
            for (const key in environment) {
                str = str.replaceAll(new RegExp(`\{${key}\}`, 'g'), environment[key]);
            }
            return str;
        }) as T
    }
    let str = shell as string;
    for (const key in environment) {
        str = str.replaceAll(new RegExp(`\{${key}\}`, 'g'), environment[key]);
    }
    return str as T;
}

export enum shellTypeEnum {
    "远端脚本" = 1,
    "本地脚本" = 2,
    "文件上传脚本" = 3
}

export function formatScriptStr(environment: Record<string, any>, shells: ShellsType) {
    let str = '依次执行的脚本：\n';
    for (const item of shells) {
        str += `${shellTypeEnum[item.type]}：\n`;
        if (item.type !== 3 && item.baseScripts) {
            for (let i = 0, l = item.baseScripts.length; i < l; i++) {
                const value = item.baseScripts[i].value;
                str += `脚本${i + 1}：\n${formatterShell(environment, value)}\n`
            }
        } else {
            str += `上传的本地文件地址：${formatterShell(environment, item.localFile ?? '')}\n远端目标目录：${formatterShell(environment, item.remoteDir ?? '')}\n`;
        }
    }
    return str;
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

export function computedTime(startTime: string | dayjs.Dayjs, endTime?: string | dayjs.Dayjs, format = 'H时mm分ss秒') {
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    // 计算时间差
    const diff = end.diff(start);
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format);
}

/** 计算一天之内的时间差 */
export function utilTime(startTime: string, format = 'H时mm分ss秒前') {
    const start = dayjs(startTime);
    const end = dayjs();
    // 计算时间差
    const diff = end.diff(start);
    if (diff >= 24 * 60 * 60 * 1000) {
        return startTime;
    }
    // 将时间差格式化为 "x时x分x秒" 的形式
    return dayjs.duration(diff).format(format);
}

/**
 * 导出数据到文件
 * @param text 要导出的数据
 * @param option 保存文件夹的选项
 */
export async function exportData(text: any, option?: SaveDialogOptions) {
    if (text == null) {
        ElMessage.warning('没有找到要导出的数据！');
        return;
    }
    const res = await electronAPI.showSaveDialog({
        title: '选择保存位置',
        defaultPath: 'config',
        filters: [{ extensions: ['json'], name: '' }],
        ...option,
    })
    if (!res.canceled && res.filePath) {
        const status = await electronAPI.writeFile(res.filePath, text);
        if (status === true) {
            ElMessage.success(`文件已保存到${res.filePath}`);
        } else {
            ElMessage.error('文件保存失败');
        }
    }
}