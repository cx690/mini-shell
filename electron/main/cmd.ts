import { exec } from 'child_process';
import { decode } from 'iconv-lite';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { temp } from './config';
import { isUtf8 } from 'node:buffer';

export type OptionsType = { env?: Record<string, any>, mergeEnv?: boolean };
export async function execCmd(command: string, type = 'powershell' as 'powershell' | 'ps1' | 'bat' | 'native' | 'sh', options?: OptionsType) {
    let cmd = command;
    let filePath = '';
    if (process.platform === 'darwin') {
        if (type === 'bat' || type === 'sh') {
            if (!fs.existsSync(temp)) {
                fs.mkdirSync(temp);
            }
            filePath = path.resolve(temp, `${Date.now()}-${Math.random()}.sh`);
            await writeFile(filePath, command);
        }
    } else {
        if (type === 'bat' || type === 'sh' || type === 'ps1') {
            if (!fs.existsSync(temp)) {
                fs.mkdirSync(temp);
            }
            filePath = path.resolve(temp, `${Date.now()}-${Math.random()}.${type === 'ps1' ? 'ps1' : 'bat'}`);
            if (type === 'ps1') {
                cmd = `powershell -File "${filePath}"`;
            } else {
                cmd = filePath;
            }
            await writeFile(filePath, command);
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
            if (filePath) {
                unlink(filePath).catch((err) => import.meta.env.DEV && console.error(err));
            }
            if (err) {
                if (isUtf8(stderr)) {
                    resolve({ code: err.code ?? 1, data: decode(stderr, 'utf8') });

                } else {
                    resolve({ code: err.code ?? 1, data: decode(stderr, 'cp936') });

                }
                return;
            }
            if (stdout) {
                if (isUtf8(stdout)) {
                    resolve({ code: 0, data: decode(stdout, 'utf8') });
                } else {
                    resolve({ code: 0, data: decode(stdout, 'cp936') });
                }
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
