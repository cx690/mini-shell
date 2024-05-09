import { exec } from 'child_process';
import { decode } from 'iconv-lite';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink } from 'fs/promises';

const temp = path.resolve(process.cwd(), 'temp');
export type OptionsType = { env?: Record<string, any>, mergeEnv?: boolean };
export async function execCmd(command: string, type = 'powershell' as 'powershell' | 'bat' | 'native' | 'sh', options?: OptionsType) {
    let cmd = command;
    let base = '';
    if (process.platform === 'darwin') {
        if (type === 'bat' || type === 'sh') {
            if (!fs.existsSync(temp)) {
                fs.mkdirSync(temp);
            }
            base = `${Date.now()}${Math.random()}.sh`;
            cmd = path.resolve(temp, base);
            await writeFile(cmd, command);
        }
    } else {
        if (type === 'bat' || type === 'sh') {
            if (!fs.existsSync(temp)) {
                fs.mkdirSync(temp);
            }
            base = `${Date.now()}${Math.random()}.bat`;
            cmd = path.resolve(temp, base);
            await writeFile(cmd, command);
        } else if (type === 'native') {
            cmd = command;
        } else {
            cmd = `powershell -Command "${command}"`;
        }
    }
    if (!options) {
        options = {
            env: {},
            mergeEnv: false,
        };
    }
    const env = (typeof options.env === 'object' && options.env) ? options.env : {};
    const targetEnv = options.mergeEnv ? { ...process.env, ...env } : env;
    return await new Promise<{ code: number, data: string }>(async (resolve) => {
        exec(cmd, { encoding: 'buffer', env: targetEnv }, (err, stdout, stderr) => {
            if (base) {
                unlink(cmd).catch((err) => console.error(err));
            }
            if (err) {
                resolve({ code: err.code ?? 1, data: decode(stderr, 'cp936') });
                return;
            }
            if (stdout) {
                resolve({ code: 0, data: decode(stdout, 'cp936') });
                return;
            }
            resolve({ code: 0, data: '' });
        });
    })
}

export async function openExe(command: string) {
    return new Promise<{ code: number, data: string }>((resolve) => {
        exec(`start ${command}`, { encoding: 'buffer', env: {} }, (err, stdout, stderr) => {
            if (err) {
                resolve({ code: err.code ?? 1, data: decode(stderr, 'cp936') });
                return;
            }
            resolve({ code: 0, data: '' });
        });
    })
}
