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
function isExcluded(relativePath: string, patterns: RegExp[]): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    for (const pattern of patterns) {
        if (pattern.test(normalizedPath)) return true;
    }
    return false;
}

/** 获取上传文件
 * @param localPath 本地目录或者文件
 * @param remoteDir 远程目录
 * @param exclude 排除的文件或目录，支持 "^node_modules/*,*.log$,^cache/*" 等正则字符串
 * @returns 上传文件列表
 */
export async function getUploadFiles(localPath: string, remoteDir: string, exclude?: string): Promise<UploadFileItem[]> {
    const stat = await fs.stat(localPath);
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
                    result.push({ localPath: currentPath, remotePath });
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

async function test() {
    const files = await getUploadFiles('D:\\work\\hippocampus\\dist', '/root');
    console.log(files[0]);
}

test();