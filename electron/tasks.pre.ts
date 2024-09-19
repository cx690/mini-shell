import type { ConfigType } from '@/store/useSetting';

const queue: (() => Promise<any>)[] = [];//上传文件队列
let running = 0;
let maxRunning = 3;
let maxCountDefault = 10;
/**
 * 并行执行指定数量的任务
 * @param tasks 生成任务的函数
 * @param maxCount 最多并行任务
 */
export async function parallelTask<T = any>(tasks: (() => Promise<T>)[], maxCount = maxCountDefault) {
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
    if (taskFn) {
        running++;
        await taskFn().catch(err => console.error(err));
        running--;
        return await startTask();
    }
}

export function changeConfig(config: ConfigType) {
    const { maxFiles, maxTasks } = config
    if (typeof maxTasks === 'number') {
        maxRunning = maxTasks < 1 ? 1 : maxTasks;
        startTask();
    }
    if (typeof maxFiles === 'number') {
        maxCountDefault = maxFiles < 1 ? 1 : maxFiles;
    }
}
