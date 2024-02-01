import { hideLoading, setLoading } from '@/utils/fetch';
import { ServerListRecord } from '@/utils/tables';
import type { ClientType } from 'electron/ssh2';
import { ElMessage } from 'element-plus';
import { defineStore } from 'pinia'
import { ref } from 'vue';

export enum StatusEnum {
    '离线',
    '连接中',
    '在线'
}

const useClient = defineStore('counter', () => {
    const client = ref<ClientType | null>(null);
    const config = ref<ServerListRecord | null>(null);
    const status = ref<0 | 1 | 2>(0);

    function connect(opt: ServerListRecord, success?: (client: ClientType) => any) {
        return new Promise<ClientType>(async (resolve, reject) => {
            status.value = 1;
            // 创建SSH客户端实例
            client.value = electronAPI.getClient();
            config.value = opt;
            // 连接到远程服务器
            client.value.on('ready', () => {
                ElMessage.success('连接成功');
                status.value = 2;
                success?.(client.value!);
                resolve(client.value!);
            }).connect({
                host: opt.host,
                port: opt.port,
                username: opt.username,
                password: opt.password,
            });
            client.value.on('error', (err: any) => {
                ElMessage.error('连接失败：' + err);
                client.value!.destroy();
                status.value = 0;
                reject(err);
            });
        })
    }

    async function test(opt: ServerListRecord) {
        return new Promise<boolean>(async (resolve) => {
            setLoading('服务器链接中……');
            const client = electronAPI.getClient();
            // 连接到远程服务器
            client.on('ready', () => {
                ElMessage.success('连接成功');
                hideLoading();
                resolve(true);
            }).connect({
                host: opt.host,
                port: opt.port,
                username: opt.username,
                password: opt.password,
            });
            client.on('error', (err: any) => {
                ElMessage.error('连接失败：' + err);
                client!.destroy();
                status.value = 0;
                hideLoading();
                resolve(false);
            });
        })
    }

    function reset() {
        if (client.value) {
            client.value.destroy();
        }
        status.value = 0;
        config.value = null;
    }

    function setConfig(opt: ServerListRecord | null) {
        config.value = opt;
    }

    function disConnect() {
        if (client.value && status.value === 2) {
            client.value.destroy();
        }
        status.value = 0;
    }
    return {
        client,
        config,
        setConfig,
        status,
        connect,
        disConnect,
        test,
        reset
    }
})
export default useClient;