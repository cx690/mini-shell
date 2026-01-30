import { Client, SFTPWrapper } from 'ssh2';
import path from 'path';
import { stat } from 'fs/promises';
import preload2Render, { UploadInfoType } from './preload2Render';
import fs from 'fs/promises';
import { getAllFiles, typeFileItem } from '../common/utils';
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
            return new Promise<ChannelType>((resolve) => {
                client.shell((err, channel) => {
                    if (err) {
                        console.error(err);
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
        end: (...args: Parameters<Client['end']>) => {
            client.end(...args);
            return clientProxy;
        },
        destroy: () => {
            client.destroy();
            return clientProxy;
        },
        uploadFile: async (localPath: string, remoteDir: string, option: { quiet?: boolean, name?: string, uuid: string }) => {
            const { quiet = false, name, uuid } = option;
            let uploadPathList: typeFileItem[] = [];
            let localDir = '';
            try {
                const stat = await fs.stat(localPath);
                if (stat.isFile()) {
                    const item = { id: localPath, ...path.parse(localPath) };
                    uploadPathList.push(item);
                    localDir = item.dir;
                } else if (stat.isDirectory()) {
                    localDir = path.parse(localPath).dir;
                    uploadPathList = await getAllFiles(localPath);
                } else {
                    return new Error('上传文件出错，请检查本地路径是否存在并且有权限访问！');
                }
            } catch (err) {
                return err;
            }
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
                            const { base, id, dir } = uploadPathList[i];
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
                                const gapDir = path.relative(localDir, dir);
                                const mkstatus = await mkRemotedir(path.join(remoteDir, gapDir));
                                if (signal.aborted) {
                                    throw new Error(message);
                                }
                                if (mkstatus !== true) {
                                    throw mkstatus;
                                } else {
                                    const remotePath = path.join(remoteDir, gapDir, base);
                                    const status = await fastPut(sftp, id, remotePath);
                                    if (signal.aborted) {
                                        throw new Error(message);
                                    }
                                    if (status !== true) {
                                        errorNum++;
                                        throw status;
                                    } else {
                                        successNum++;
                                    }
                                    emit({
                                        successNum,
                                        errorNum,
                                        total,
                                        status: (successNum + errorNum) === total ? 2 : 1,
                                        message: status + '',
                                        name,
                                    })
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

async function fastPut(sftp: SFTPWrapper, localPath: string, remotePath: string) {
    return new Promise<true | Error>((resolve) => {
        sftp.fastPut(localPath, remotePath.replaceAll(/\\/g, '/'), function (err) {
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
