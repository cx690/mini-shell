import { hideLoading, setLoading } from '@/utils/fetch';
import { useEnum } from '@/utils/hooks';
import { ServerListRecord } from '@/utils/tables';
import type { ClientType } from 'electron/preload/ssh2';
import { ElMessage } from 'element-plus';
import { defineStore } from 'pinia'
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

export function useStatusEnum() {
    return useEnum((t) => ({
        0: t('offline'),
        1: t('connecting'),
        2: t('online')
    }))
}

const useClient = defineStore('counter', () => {
    const client = ref<ClientType | null>(null);
    const config = ref<ServerListRecord | null>(null);
    const status = ref<0 | 1 | 2>(0);
    const { t } = useI18n();
    function connect(opt: ServerListRecord, success?: (client: ClientType) => any) {
        return new Promise<ClientType>(async (resolve, reject) => {
            status.value = 1;
            // 创建SSH客户端实例    
            client.value = electronAPI.getClient();
            const holdClient = client.value;
            config.value = opt;
            // 连接到远程服务器
            client.value.on('ready', () => {
                if (holdClient === client.value) {//防止重复链接的时候前者状态覆盖后者
                    ElMessage.success(t('connect-success'));
                    status.value = 2;
                }
                success?.(client.value!);
                resolve(client.value!);
            }).connect({
                host: opt.host,
                port: opt.port,
                username: opt.username,
                password: opt.password,
            });
            client.value.on('error', (err: any) => {
                if (holdClient === client.value) {//防止重复链接的时候前者状态覆盖后者
                    ElMessage.error(t('connect-err', { err: err + '' }));
                    client.value!.destroy();
                    status.value = 0;
                }
                reject(err);
            });
        })
    }

    async function test(opt: ServerListRecord) {
        return new Promise<boolean>(async (resolve) => {
            setLoading(t('connecting6'));
            const client = electronAPI.getClient();
            // 连接到远程服务器
            client.on('ready', () => {
                ElMessage.success(t('connect-success'));
                hideLoading();
                resolve(true);
            }).connect({
                host: opt.host,
                port: opt.port,
                username: opt.username,
                password: opt.password,
            });
            client.on('error', (err: any) => {
                ElMessage.error(t('connect-err', { err: err + '' }));
                client!.destroy();
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