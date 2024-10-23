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
