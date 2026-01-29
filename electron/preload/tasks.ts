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
export async function parallelTask<T = any>(tasks: Iterable<(() => Promise<T> | Promise<T>)>, maxCount = maxCountDefault) {
    if (!tasks || typeof tasks !== 'object' || typeof tasks[Symbol.iterator] !== 'function') {
        throw new Error('tasks must be an iterable object');
    }
    const iterator = tasks[Symbol.iterator]();
    const PInfo = Promise.withResolvers<T[]>();
    const taskFn = async () => {
        const list: T[] = [];
        let index = 0;
        async function excuteTask() {
            const it = iterator.next();
            const currentIndex = index;
            index++;
            if (!it.done) {
                let promise: any = typeof it.value === 'function' ? it.value() : it.value;
                if (typeof promise?.then !== 'function') {
                    promise = Promise.resolve(promise);
                }
                if (promise) {
                    const res = await promise.catch((err: any) => {
                        PInfo.reject(err);
                        throw err;//终止当前上传
                    });
                    list[currentIndex] = res;
                }
                await excuteTask();
            }
        }
        await Promise.all(Array.from({ length: maxCount }, () => excuteTask()));
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
