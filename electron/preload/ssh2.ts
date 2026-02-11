import { Client, SFTPWrapper } from 'ssh2';
import path from 'path';
import { stat } from 'fs/promises';
import preload2Render, { UploadInfoType } from './preload2Render';
import { getUploadFiles, UploadFileItem } from '../common/utils';
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
                                }
                                resolve(list.map((item) => {
                                    const isDir = typeof item.attrs.isDirectory === 'function'
                                        ? item.attrs.isDirectory()
                                        : (item.attrs.mode != null && (item.attrs.mode & 0o170000) === 0o040000)
                                        || (typeof item.longname === 'string' && item.longname.trimStart().charAt(0) === 'd');
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
                                }
                                resolve(true);
                            });
                        }),
                        rmdir: (path: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.rmdir(path, (err) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve(true);
                            });
                        }),
                        unlink: (path: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.unlink(path, (err) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve(true);
                            });
                        }),
                        rename: (oldPath: string, newPath: string) => new Promise<true | Error>((resolve, reject) => {
                            sftp.rename(oldPath, newPath, (err) => {
                                if (err) {
                                    reject(err);
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
        uploadFile: async (localPath: string, remoteDir: string, option: { quiet?: boolean, name?: string, uuid: string, exclude?: string }) => {
            const { quiet = false, name, uuid, exclude } = option;
            const uploadPathList: UploadFileItem[] = await getUploadFiles(localPath, remoteDir, exclude);
            const emit = emitUpload(quiet, uuid);
            let successNum = 0;
            let errorNum = 0;
            const total = uploadPathList.length;
            let _sftp: SFTPWrapper | null = null;
            const status = await new Promise<boolean | Error>((resolve, reject) => {
                uploadAbort[uuid] = new AbortController();
                const { signal } = uploadAbort[uuid];
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
                    const mkRemotedir = getMkRemoteDir(client);
                    const status = await mkRemotedir(remoteDir);//创建远程文件上传根目录
                    if (status !== true) {
                        reject(status);
                        return;
                    }
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
                                const mkstatus = await mkRemotedir(itDir);
                                if (signal.aborted) {
                                    throw new Error(message);
                                }
                                if (mkstatus !== true) {
                                    throw mkstatus;
                                } else {
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
                                            type: 'fileSize'
                                        })
                                    } : undefined;
                                    const status = await fastPut(sftp, localPath, remotePath, emitProgress);
                                    if (signal.aborted) {
                                        throw new Error(message);
                                    }
                                    if (status !== true) {
                                        errorNum++;
                                        throw status;
                                    } else {
                                        successNum++;
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

                                    return status;
                                }
                            }
                        }
                    }
                    await parallelTask(genTasks()).catch(err => reject(err));
                    resolve(true);
                    sftp.end();
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
            return status;
        },
        abortUploadFile(uuid: string) {
            if (uuid && uploadAbort[uuid]) {
                uploadAbort[uuid].abort();
            };
        },
        downloadFile: async (localDir: string, remotePath: string) => {
            return new Promise<boolean | Error | string>(async (resolve) => {
                const info = await stat(localDir);
                if (!info.isDirectory()) {
                    resolve(`${localDir}不是一个文件夹目录！`);
                    return;
                }
                client.sftp(function (err, sftp) {
                    if (err) {
                        console.error(err);
                        resolve(err);
                        sftp.end();
                        return;
                    };
                    const { base } = path.parse(remotePath);
                    const localPath = localDir + '/' + base;
                    sftp.fastGet(remotePath, localPath, function (err) {
                        if (err) {
                            console.error(err);
                            resolve(err);
                        };
                        resolve(true);
                        sftp.end();
                    });
                });
            }).catch((err: Error) => err)
        }
    };
    return clientProxy;
}

export default getClient;

/** 去掉重复的创建目录 */
function getMkRemoteDir(client: Client) {
    const promiseInfo: Record<string, Promise<any>> = {}
    return async (dir: string) => {
        if (!promiseInfo[dir]) {
            promiseInfo[dir] = mkRemotedir(client, dir);
        }
        return promiseInfo[dir];
    }
}

async function mkRemotedir(client: Client, dir: string) {
    return new Promise<true | Error>((resolve) => {
        client.exec(`mkdir -p ${dir.replaceAll(/\\/g, '/')}`, (err, channel) => {
            if (err) {
                console.error(err);
                resolve(err);
                return;
            };
            channel.on('exit', (code) => {
                if (code) {
                    resolve(new Error(`远端新建目录：${dir.replaceAll(/\\/g, '/')}错误！`))
                } else {
                    resolve(true);
                }
            })
        })
    })
}

async function fastPut(sftp: SFTPWrapper, localPath: string, remotePath: string, emitProgress?: (total: number, fsize: number) => void) {
    return new Promise<true | Error>((resolve) => {
        const option = emitProgress ? {
            step: (total: number, nb: number, fsize: number) => {
                emitProgress(total, fsize);
            }
        } : {};
        sftp.fastPut(localPath, remotePath, option, function (err) {
            if (err) {
                console.error(err);
                resolve(err);
            };
            resolve(true);
        })
    })
}

function emitUpload(quiet: boolean, uuid: string) {
    return function emit(data: UploadInfoType) {
        if (quiet) return;
        preload2Render({
            type: 'upload',
            uuid,
            data
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