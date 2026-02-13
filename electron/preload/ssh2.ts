import { Client, type FileEntryWithStats, SFTPWrapper } from 'ssh2';
import path from 'path';
import fs from 'fs/promises';
import preload2Render, { UploadInfoType } from './preload2Render';
import { getUploadFiles, isExcluded, UploadFileItem } from '../common/utils';
import { parallelTask } from './tasks';

function getClient() {
    const client = new Client();
    const uploadAbort: Record<string, AbortController> = {};
    const clientProxy = {
        on: (...args: any[]) => {
            client.on(...args as Parameters<Client['on']>);
            return clientProxy;
        },
        connect: (...args: Parameters<Client['connect']>) => {
            client.connect(...args);
            return clientProxy;
        },
        exec: (command: string, callbackInfo?: (data: string) => any) => {
            return new Promise<number>((resolve) => {
                client.exec(command, (err, channel) => {
                    if (err) {
                        console.error(err);
                    }
                    channel.on('close', (code: number, signal: number) => {
                        if (code !== 0) {
                            callbackInfo?.(`<p class="error">Stream closed with code:${code ?? 'unknown'}${signal != null ? `, signal:${signal}` : ''}</p>`);
                        }
                        resolve(code);
                    }).on('data', (data: any) => {
                        callbackInfo?.(`<pre class="success">${data}</pre>`);
                    }).stderr.on('data', (data) => {
                        callbackInfo?.(`<pre class="error">${data}</pre>`);
                    });
                })
            })
        },
        shell: async (callbackInfo?: (data: Uint8Array | { code: number, message: string, action: string, signal?: number | null }) => any) => {
            return new Promise<ChannelType>((resolve, reject) => {
                client.shell((err, channel) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                        return;
                    }
                    channel.on('close', (code: number, signal: number) => {
                        callbackInfo?.({
                            code: code ?? -1,
                            signal,
                            message: '',
                            action: 'close'
                        });
                    }).on('data', (data: any) => {
                        callbackInfo?.(data);
                    }).stderr.on('data', (data) => {
                        callbackInfo?.(data);
                    });
                    resolve({
                        write: function (chunk: any) {
                            channel.write(chunk, undefined, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                        },
                        destroy: function () {
                            channel.destroy();
                        },
                        setWindow: function ({ cols, rows, width, height }: { cols: number, rows: number, height: number, width: number }) {
                            channel.setWindow(rows, cols, height, width);
                        }
                    });
                })
            })
        },
        sftp: async () => {
            return new Promise<SFTPType>((resolve, reject) => {
                client.sftp((err, sftp) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }
                    resolve({
                        readdir: (path: string) => new Promise<Array<{ name: string; isDirectory: boolean; size?: number; mtime?: number }>>((resolve, reject) => {
                            sftp.readdir(path, (err, list) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(list.map((item) => {
                                    const isDir = testDir(item);
                                    return {
                                        name: item.filename,
                                        isDirectory: isDir,
                                        size: isDir ? undefined : item.attrs.size,
                                        mtime: item.attrs.mtime ? item.attrs.mtime * 1000 : undefined,
                                    };
                                }));
                            });
                        }),
                        mkdir: (path: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.mkdir(path, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(true);
                            });
                        }),
                        rmdir: (path: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.rmdir(path, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(true);
                            });
                        }),
                        unlink: (path: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.unlink(path, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(true);
                            });
                        }),
                        rename: (oldPath: string, newPath: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.rename(oldPath, newPath, (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(true);
                            });
                        }),
                        end: () => new Promise<void>((resolve) => {
                            sftp.end();
                            resolve();
                        }),
                    });
                });
            });
        },
        end: (...args: Parameters<Client['end']>) => {
            client.end(...args);
            return clientProxy;
        },
        destroy: () => {
            client.destroy();
            return clientProxy;
        },
        uploadFile: async (localPath: string, remotePath: string, option: { quiet?: boolean, name?: string, uuid: string, exclude?: string }) => {
            const { quiet = false, name, uuid, exclude } = option;
            const emit = emitUpload(quiet, uuid);
            let successNum = 0;
            let errorNum = 0;
            let total = 0;
            let _sftp: SFTPWrapper | null = null;
            const status = await new Promise<boolean | Error>(async (resolve, reject) => {
                uploadAbort[uuid] = new AbortController();
                const { signal } = uploadAbort[uuid];
                emit({
                    successNum,
                    errorNum,
                    total,
                    status: 4,
                    name,
                })
                const uploadPathList: UploadFileItem[] = await getUploadFiles(localPath, remotePath, exclude).catch(err => { reject(err); return [] });
                total = uploadPathList.length;
                emit({
                    successNum,
                    errorNum,
                    total,
                    status: 0,
                    name,
                })
                const message = `${name ? (name + ' u') : 'U'}pload canceled!`;
                uploadAbort[uuid].signal.addEventListener('abort', () => {
                    reject(new Error(message));
                })
                if (total === 0) {
                    resolve(true);
                    return;
                }
                client.sftp(async function (err, sftp) {
                    _sftp = sftp;
                    if (err) {
                        console.error(err);
                        reject(err);
                        return;
                    };
                    if (signal.aborted) {
                        reject(new Error(message));
                        return;
                    }
                    if (uploadPathList.length === 0) {
                        emit({
                            successNum,
                            errorNum,
                            total,
                            status: 2,
                            name,
                        })
                        resolve(true);
                        sftp.end();
                        return;
                    }
                    let start = false;
                    const mkRemotedir = getMkRemoteDir(sftp);
                    function* genTasks() {// 防止上传数量过多导致内存占用过高，改为迭代器方式生成任务，不直接使用数组
                        for (let i = 0, len = uploadPathList.length; i < len; i++) {
                            const { localPath, remotePath } = uploadPathList[i];
                            yield async () => {
                                if (signal.aborted) {
                                    throw new Error(message);
                                }
                                if (!start) {
                                    emit({
                                        successNum,
                                        errorNum,
                                        total,
                                        status: 1,
                                        name,
                                    })
                                    start = true;
                                }
                                const itDir = path.dirname(remotePath);
                                await mkRemotedir(itDir);
                                if (signal.aborted) {
                                    throw new Error(message);
                                }

                                let totalSize = 0;
                                let transferredSize = 0;
                                const emitProgress = total === 1 ? function (total: number, fsize: number) {
                                    totalSize = fsize;
                                    transferredSize = total;
                                    emit({
                                        successNum: transferredSize,
                                        errorNum: 0,
                                        total: fsize,
                                        status: 1,
                                        transferType: 'upload',
                                        type: 'fileSize'
                                    })
                                } : undefined;
                                await sftpFastPut(sftp, localPath, remotePath, emitProgress);
                                successNum++;
                                if (signal.aborted) {
                                    throw new Error(message);
                                }
                                if (total === 1) {
                                    emit({
                                        successNum: transferredSize,
                                        errorNum,
                                        total: totalSize,
                                        status: 2,
                                        name,
                                        transferType: 'upload',
                                        type: 'fileSize'
                                    })
                                } else {
                                    emit({
                                        successNum,
                                        errorNum,
                                        total,
                                        status: (successNum + errorNum) === total ? 2 : 1,
                                        name,
                                    })
                                }
                            }
                        }
                    }
                    await parallelTask(genTasks()).catch(err => reject(err));
                    resolve(true);
                });
            }).catch((err: Error) => {
                emit({
                    successNum,
                    errorNum,
                    total,
                    status: 3,
                    message: err + '',
                    name,
                })
                _sftp?.end();
                return err;
            });
            delete uploadAbort[uuid];
            (_sftp as SFTPWrapper | null)?.end();
            return status;
        },
        abortUploadFile(uuid: string) {
            if (uuid && uploadAbort[uuid]) {
                uploadAbort[uuid].abort();
            };
        },
        downloadFile: async (localPath: string, remotePath: string, option: { quiet?: boolean, name?: string, uuid: string, exclude?: string }) => {
            const { quiet = false, name, uuid, exclude } = option;
            const emit = emitUpload(quiet, uuid, { transferType: 'download' });
            let successNum = 0;
            let errorNum = 0;
            let total = 0;
            let _sftp: SFTPWrapper | null = null;
            const status = await new Promise<boolean | Error | string>(async (resolve, reject) => {
                uploadAbort[uuid] = new AbortController();
                const { signal } = uploadAbort[uuid];
                const message = `${name ? (name + ' d') : 'D'}ownload canceled!`;
                signal.addEventListener('abort', () => {
                    reject(new Error(message));
                })
                const info = await fs.stat(localPath).catch(err => { reject(err); return { isDirectory: () => false } });
                if (!info.isDirectory()) {
                    reject(new Error(`${localPath} is not a directory!`));
                    return;
                }
                if (signal.aborted) {
                    reject(new Error(message));
                    return;
                }
                client.sftp(async function (err, sftp) {
                    _sftp = sftp;
                    if (err) {
                        console.error(err);
                        reject(err);
                        return;
                    }
                    if (signal.aborted) {
                        return;
                    }
                    emit({
                        successNum,
                        errorNum,
                        total: 0,
                        status: 4,
                        name,
                    })
                    const downloadList = await getDownloadList(sftp, remotePath.replaceAll(/\\/g, '/'), localPath, { signal, exclude }).catch(err => { reject(err); return [] });
                    total = downloadList.length;
                    emit({
                        successNum,
                        errorNum,
                        total,
                        status: 0,
                        name,
                    })

                    if (total === 0) {
                        resolve(true);
                        return;
                    }
                    let start = false;
                    const mkLocalDir = getMkLocalDir();
                    function* genTasks() {
                        for (const item of downloadList) {
                            yield async () => {
                                if (!start) {
                                    emit({
                                        successNum,
                                        errorNum,
                                        total,
                                        status: 1,
                                        name,
                                    })
                                    start = true;
                                }
                                if (signal.aborted) {
                                    throw new Error(message);
                                }

                                let totalSize = 0;
                                let transferredSize = 0;
                                const emitProgress = total === 1 ? function (total: number, fsize: number) {
                                    totalSize = fsize;
                                    transferredSize = total;
                                } : undefined;
                                const dir = path.dirname(item.localPath);
                                await mkLocalDir(dir);
                                await sftpFastGet(sftp, item.remotePath, item.localPath, emitProgress);
                                successNum++;
                                if (signal.aborted) {
                                    throw new Error(message);
                                }
                                if (total === 1) {
                                    emit({
                                        successNum: transferredSize,
                                        errorNum,
                                        total: totalSize,
                                        status: 2,
                                        name,
                                        type: 'fileSize'
                                    })
                                } else {
                                    emit({
                                        successNum,
                                        errorNum,
                                        total,
                                        status: (successNum + errorNum) === total ? 2 : 1,
                                        name,
                                    })
                                }
                            }
                        }
                    }
                    await parallelTask(genTasks()).catch(err => reject(err));
                    resolve(true);
                });
            }).catch((err: Error) => {
                emit({
                    successNum,
                    errorNum,
                    total,
                    status: 3,
                    message: err + '',
                    name,
                    transferType: 'download',
                })
                return err;
            })
            delete uploadAbort[uuid];
            (_sftp as SFTPWrapper | null)?.end();
            return status;
        }
    };
    return clientProxy;
}

export default getClient;

/** 去掉重复的创建目录 */
function getMkRemoteDir(sftp: SFTPWrapper) {
    const promiseInfo: Record<string, Promise<any>> = {}
    return async (dir: string) => {
        if (!promiseInfo[dir]) {
            promiseInfo[dir] = sftMkdir(sftp, dir);
        }
        return promiseInfo[dir];
    }
}

function getMkLocalDir() {
    const promiseInfo: Record<string, Promise<any>> = {}
    return async (dir: string) => {
        if (!promiseInfo[dir]) {
            promiseInfo[dir] = fs.mkdir(dir, { recursive: true });
        }
        return promiseInfo[dir];
    }
}

function emitUpload(quiet: boolean, uuid: string, others = { transferType: 'upload' as 'upload' | 'download' }) {
    return function emit(data: UploadInfoType) {
        if (quiet) return;
        preload2Render({
            type: 'upload',
            uuid,
            data: { ...others, ...data }
        })
    }
}

export type ClientType = ReturnType<typeof getClient>;
export type ChannelType = {
    write(chunk: any): void,
    destroy(): void,
    setWindow(opt: { cols: number, rows: number, height: number, width: number }): void,
}
export type SFTPType = {
    readdir(path: string): Promise<Array<{ name: string; isDirectory: boolean; size?: number; mtime?: number }>>,
    mkdir(path: string): Promise<true | Error>,
    rmdir(path: string): Promise<true | Error>,
    unlink(path: string): Promise<true | Error>,
    rename(oldPath: string, newPath: string): Promise<true | Error>,
    end(): Promise<void>,
}

/** 封装 sftp.stat 为 Promise */
function sftpStat(sftp: SFTPWrapper, p: string): Promise<{ isDirectory: () => boolean }> {
    return new Promise((resolve, reject) => {
        sftp.stat(p, (err, stats) => (err ? reject(err) : resolve(stats!)));
    });
}

function sftpReaddir(sftp: SFTPWrapper, remote: string) {
    return new Promise<FileEntryWithStats[]>((resolve, reject) => {
        sftp.readdir(remote, (err, list) => (err ? reject(err) : resolve(list!)));
    });
}

function sftMkdir(sftp: SFTPWrapper, remote: string) {
    return new Promise<true | Error>((resolve, reject) => {
        sftp.mkdir(remote, (err) => (err ? reject(err) : resolve(true)));
    });
}

/** 封装 sftp.fastGet 为 Promise */
function sftpFastGet(sftp: SFTPWrapper, remotePath: string, localPath: string, emitProgress?: (total: number, fsize: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        sftp.fastGet(remotePath, localPath, {
            step: (total, nb, fsize) => {
                emitProgress?.(total, fsize);
            }
        }, (err) => (err ? reject(err) : resolve()));
    });
}

async function sftpFastPut(sftp: SFTPWrapper, localPath: string, remotePath: string, emitProgress?: (total: number, fsize: number) => void) {
    return new Promise<true | Error>((resolve, reject) => {
        const option = emitProgress ? {
            step: (total: number, nb: number, fsize: number) => {
                emitProgress(total, fsize);
            }
        } : {};
        sftp.fastPut(localPath, remotePath, option, function (err) {
            if (err) {
                console.error(err);
                reject(err);
            };
            resolve(true);
        })
    })
}

function testDir(item: FileEntryWithStats) {
    return typeof item.attrs.isDirectory === 'function'
        ? item.attrs.isDirectory()
        : (item.attrs.mode != null && (item.attrs.mode & 0o170000) === 0o040000)
        || (typeof item.longname === 'string' && item.longname.trimStart().charAt(0) === 'd');
}

type OptionType = {
    /** 取消信号 */
    signal?: AbortSignal,
    /**排除的文件或目录，支持 "^node_modules/*,*.log$,^cache/*" 等正则字符串 */
    exclude?: string
}
/** 获取下载文件列表 
 * @param sftp SFTPWrapper
 * @param remotePath 远程路径
 * @param localPath 本地路径
 * @param option OptionType
 * @returns 下载文件列表
 */
async function getDownloadList(sftp: SFTPWrapper, remotePath: string, localPath: string, option?: OptionType) {
    const result: { localPath: string, remotePath: string }[] = [];
    const { signal, exclude } = option || {};
    if (signal?.aborted) {
        return result;
    }
    const stats = await sftpStat(sftp, remotePath);
    if (signal?.aborted) {
        return result;
    }
    if (stats.isDirectory()) {
        if (!localPath.endsWith('/') || !localPath.endsWith('\\')) {
            localPath += process.platform === 'win32' ? '\\' : '/';
        };
        if (!remotePath.endsWith('/')) {
            localPath += `${path.parse(remotePath).base}/`;
        }
        const patterns = exclude ? exclude.split(',').filter(str => str.trim() !== '').map((s) => {
            const withWildcard = s.trim().replace(/\*/g, '.*');
            return new RegExp(withWildcard);
        }) : [];

        const dirs: string[] = [remotePath];
        function* genTasks(dirs: string[]) {
            while (dirs.length) {
                const currentDir = dirs.shift();
                if (!currentDir) {
                    return;
                }
                yield async () => {
                    if (signal?.aborted) {
                        return;
                    }
                    const list = await sftpReaddir(sftp, currentDir);
                    for (let i = 0, len = list.length; i < len; i++) {
                        if (signal?.aborted) {
                            return result;
                        }
                        const item = list[i];
                        const name = item.filename;
                        const currentPath = path.join(currentDir, name).replace(/\\/g, '/');
                        const relativePath = path.relative(remotePath, currentPath).replace(/\\/g, '/');
                        if (patterns.length && isExcluded(relativePath, patterns)) continue;
                        if (testDir(item)) {
                            dirs.push(currentDir + '/' + item.filename);
                        } else {
                            result.push({ localPath: path.join(localPath, relativePath), remotePath: currentPath });
                        }
                    }
                }
            }
        }
        while (dirs.length) {
            await parallelTask(genTasks(dirs));
        }
    } else {
        result.push({ localPath: path.join(localPath, path.parse(remotePath).base), remotePath: remotePath });
    }
    return result;
}
