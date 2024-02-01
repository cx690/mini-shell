import fs from 'fs/promises';
import path from 'path';

export type typeFileItem = { id: string } & ReturnType<typeof path.parse>

/** 获取目录下的所有文件 */
export async function getAllFiles(dir: string, exclud?: RegExp) {
    const dirs: string[] = await fs.readdir(dir);
    const allFiles: typeFileItem[] = [];
    for (const item of dirs) {
        const id = path.resolve(dir, item);
        if (exclud && exclud.test(id)) continue;
        const stat = await fs.stat(id);
        if (stat.isFile()) {
            allFiles.push({
                id,
                ...path.parse(id),
            })
        } else if (stat.isDirectory()) {
            const list = await getAllFiles(id);
            allFiles.push(...list);
        }
    }
    return allFiles
}

/**
 * 并行执行指定数量的任务
 * @param tasks 生成任务的函数
 * @param maxCount 最多并行任务
 * @returns 
 */
export async function parallelTask<T = any>(tasks: (() => Promise<T>)[], maxCount = 10) {
    const list: T[] = [];
    const source = [...tasks];
    async function excuteTask(i: number) {
        const task = tasks.shift();
        if (task) {
            const res = await task();
            list[i] = res;
            if (tasks.length) {
                await excuteTask(source.indexOf(task));
            }
        }
        return true;
    }
    await Promise.all(tasks.slice(0, maxCount).map((item, i) => excuteTask(i)));
    return list;
}
