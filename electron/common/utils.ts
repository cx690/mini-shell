import fs from 'fs/promises';
import path from 'path';

export type typeFileItem = { id: string } & ReturnType<typeof path.parse>

/** 获取目录下的所有文件 */
export async function getAllFiles(dir: string, exclud?: RegExp) {
    let dirs: string[] = []
    try {
        dirs = await fs.readdir(dir);
    } catch (error) {
        import.meta.env.DEV && console.error(error);
        return [];
    }
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

export type UploadFileItem = {
    localPath: string;
    remotePath: string;
}

/** 检查路径是否匹配排除规则 */
export function isExcluded(relativePath: string, patterns: RegExp[]): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    for (const pattern of patterns) {
        if (pattern.test(normalizedPath)) return true;
    }
    return false;
}

type UploadOptionType = {
    /** 取消信号 */
    signal?: AbortSignal,
    /**排除的文件或目录，支持 "^node_modules/*,*.log$,^cache/*" 等正则字符串 */
    exclude?: string
    findCallback?: (info: { length: number, item: { localPath: string, remotePath: string } }) => any
}
/** 获取上传文件
 * @param localPath 本地目录或者文件
 * @param remoteDir 远程目录
 * @param option UploadOptionType
 * @returns 上传文件列表
 */
export async function getUploadFiles(localPath: string, remoteDir: string, option?: UploadOptionType): Promise<UploadFileItem[]> {
    const { exclude, signal, findCallback } = option || {};
    const stat = await fs.stat(localPath);
    if (signal?.aborted) {
        return []
    }
    if (stat.isFile()) {
        return [{ localPath, remotePath: path.join(remoteDir, path.parse(localPath).base).replace(/\\/g, '/') }];
    } else if (stat.isDirectory()) {
        if (!remoteDir.endsWith('/')) {
            remoteDir += '/';
        };
        if (!localPath.endsWith('/') && !localPath.endsWith('\\')) {
            remoteDir += `${path.parse(localPath).base}/`;
        }
        const result: UploadFileItem[] = [];
        const patterns = exclude ? exclude.split(',').filter(str => str.trim() !== '').map((s) => {
            const withWildcard = s.trim().replace(/\*/g, '.*');
            return new RegExp(withWildcard);
        }) : [];

        async function walk(currentDir: string) {
            if (signal?.aborted) {
                return []
            }
            let entries: string[] = [];
            try {
                entries = await fs.readdir(currentDir);
            } catch {
                return;
            }
            for (let i = 0, len = entries.length; i < len; i++) {
                const name = entries[i];
                const currentPath = path.join(currentDir, name);
                const relativePath = path.relative(localPath, currentPath).replace(/\\/g, '/');
                if (patterns.length && isExcluded(relativePath, patterns)) continue;

                const stat = await fs.stat(currentPath);
                if (stat.isFile()) {
                    const remotePath = path.join(remoteDir, relativePath).replace(/\\/g, '/');
                    const item = { localPath: currentPath, remotePath }
                    result.push(item);
                    findCallback?.({ length: result.length, item });
                } else if (stat.isDirectory()) {
                    await walk(currentPath);
                }
            }
        }

        await walk(localPath);
        return result;
    } else {
        throw new Error('本地路径不存在或者无权限访问！');
    }
}

/** 节流函数，一段时间只触发一次 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number = 500) {
    let lock: boolean = false;
    return function (this: any, ...args: any[]) {
        if (lock) return;
        lock = true;
        fn.apply(this, args);
        setTimeout(() => {
            lock = false;
        }, delay)
    } as T;
}
