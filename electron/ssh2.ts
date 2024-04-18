import { Client, SFTPWrapper } from 'ssh2';
import path from 'path';
import { stat } from 'fs/promises';
import { v4 } from 'uuid';
import preload2Render, { UploadInfoType } from './preload2Render';
import fs from 'fs/promises';
import { getAllFiles, parallelTask, typeFileItem } from './utils';

function getClient() {
    const client = new Client();
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
                        callbackInfo?.(`<p class="${code === 0 ? 'success' : 'error'}">Stream closed with code:${code}${signal != null ? `, signal:${signal}` : ''}</p>`);
                        resolve(code);
                    }).on('data', (data: any) => {
                        callbackInfo?.(`<pre class="success">${data}</pre>`);
                    }).stderr.on('data', (data) => {
                        callbackInfo?.(`<pre class="error">${data}</pre>`);
                    });
                })
            })
        },
        shell: async (callbackInfo?: (data: string | { code: number, message: string, action: string, signal?: number | null }) => any) => {
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
                        const str = `${data}`;
                        if (/^rz waiting to receive\./.test(str)) {
                            callbackInfo?.({
                                code: 0,
                                message: '',
                                action: 'upload'
                            })
                            return;
                        }
                        callbackInfo?.(str);
                    }).stderr.on('data', (data) => {
                        callbackInfo?.(`${data}`);
                    });
                    resolve({
                        write: function (command: string) {
                            channel.write(command, undefined, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                        },
                        end: function (...args: any[]) {
                            channel.end(...args);
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
        uploadFile: async (localPath: string, remoteDir: string, quiet = false) => {
            const stat = await fs.stat(localPath);
            let uploadPathList: typeFileItem[] = [];
            let localDir = '';
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
            const emit = emitUpload(quiet);
            let successNum = 0;
            let errorNum = 0;
            const total = uploadPathList.length;
            emit({
                successNum,
                errorNum,
                total,
                status: 0
            })
            const status = await new Promise<boolean | Error>((resolve) => {
                client.sftp(async function (err, sftp) {
                    if (err) {
                        console.error(err);
                        resolve(err);
                        sftp.end();
                        return;
                    };
                    const mkRemotedir = getMkRemoteDir(client);
                    emit({
                        successNum,
                        errorNum,
                        total,
                        status: 1,
                    })

                    await mkRemotedir(remoteDir).catch(err => {
                        sftp.end();
                        emit({
                            successNum,
                            errorNum,
                            total,
                            status: 3,
                            message: err + '',
                        })
                        throw err;
                    });//创建远程文件上传根目录
                    const tasks = uploadPathList.map(({ base, id, dir }) => async () => {
                        const gapDir = path.relative(localDir, dir);
                        const mkstatus = await mkRemotedir(path.join(remoteDir, gapDir));
                        if (mkstatus !== true) {
                            emit({
                                successNum,
                                errorNum,
                                total,
                                status: 3,
                                message: mkstatus + '',
                            })
                            throw mkstatus;
                        } else {
                            const remotePath = path.join(remoteDir, gapDir, base);
                            const status = await fastPut(sftp, id, remotePath);
                            if (status !== true) {
                                errorNum++;
                                emit({
                                    successNum,
                                    errorNum,
                                    total,
                                    status: 3,
                                    message: status + '',
                                })
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
                            })
                            return status;
                        }
                    });
                    await parallelTask(tasks).finally(() => {
                        sftp.end();
                    })
                    resolve(true);
                });
            }).catch((err: Error) => err);
            return status;
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

function emitUpload(quiet: boolean) {
    const uuid = quiet ? '' : v4();
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
    write(command: string): void,
    end(...args: any[]): void
}
