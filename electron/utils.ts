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

const queue: (() => Promise<any>)[] = [];//上传文件队列
let running = 0;
const maxRunning = 3;
/**
 * 并行执行指定数量的任务
 * @param tasks 生成任务的函数
 * @param maxCount 最多并行任务
 */
export async function parallelTask<T = any>(tasks: (() => Promise<T>)[], maxCount = 10) {
    const source = Object.entries(tasks);
    const PInfo = Promise.withResolvers<T[]>();
    const taskFn = async () => {
        const list: T[] = [];
        async function excuteTask() {
            const item = source.shift();
            if (item) {
                const [i, task] = item;
                const res = await task().catch(err => {
                    PInfo.reject(err);
                    throw err;//终止当前上传
                });
                list[+i] = res;
                if (tasks.length) {
                    await excuteTask();
                }
            }
        }
        await Promise.all(tasks.slice(0, maxCount).map(() => excuteTask()));
        PInfo.resolve(list);
        return list;
    }
    queue.push(taskFn);
    startTask();
    return await PInfo.promise;
}

/** 执行队列任务 */
async function startTask() {
    if (running >= maxRunning) {
        return;
    };
    const taskFn = queue.shift();
    if (!taskFn) {
        return;
    }
    if (taskFn) {
        running++;
        await taskFn().catch(err => console.error(err));
        running--;
        return await startTask();
    }
}
