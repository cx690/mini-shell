import fs from 'fs/promises';
import path from 'path';

/**
 * 复制文件或者文件夹，要求绝对地址
 * @param src 要复制的文件或者文件夹
 * @param dest 目标地址或者目录
 * @param option 复制选项
 * @returns 是否正常完成复制
 */
export async function copy(src: string, dest: string, option: {
    /** 是否强制覆盖，默认true */
    force?: boolean,
    /** 是否创建源文件目录为目标目录的起始目录 */
    createRootDir?: boolean
} = {}) {
    if (!src || !dest) return false;
    let flag = true;
    try {
        const srcStat = await fs.stat(src);
        const srcParse = path.parse(src);
        const destParse = path.parse(dest);
        await fs.mkdir(destParse.ext ? destParse.dir : dest, { recursive: true });
        if (srcStat.isFile()) {
            const destFile = destParse.ext ? dest : (path.join(dest, path.parse(src).base));
            if (option.force === false) {
                const isEixt = await fs.access(destFile).then(() => true, () => false);
                if (!isEixt) {
                    await fs.copyFile(src, destFile);
                }
            } else {
                await fs.copyFile(src, destFile);
            }
            return true;
        } else if (srcStat.isDirectory() && !destParse.ext) {
            const _dest = option.createRootDir ? path.join(dest, srcParse.base) : dest;
            const files = await fs.readdir(src);
            for (const base of files) {
                if (! await copy(path.join(src, base), path.join(_dest, base), { force: option.force })) {
                    flag = false;
                }
            }
        } else {
            return false;
        }
    } catch (error) {
        import.meta.env.DEV && console.error(error);
        return false;
    }
    return flag;
}
