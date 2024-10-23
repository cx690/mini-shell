import { app } from "electron";
import path from "path";

/** 缓存目录 */
export const temp = import.meta.env.DEV ? path.resolve(process.cwd(), './temp') : path.resolve(app.getPath('temp'), './mini-shell-temp');

/** 外部依赖的语言文件 */
export const langDir = import.meta.env.PROD ? path.resolve(app.getPath('exe'), '../lang') : '';

/** 数据备份缓存目录 */
export const backupDirectory = path.resolve(app.getPath('temp'), './mini-shell-temp/backupDirectory');
