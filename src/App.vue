<template>
    <el-config-provider :locale="settings.ElLocale">
        <router-view></router-view>
    </el-config-provider>
</template>

<script setup lang="ts">
import type { UploadInfoType } from 'electron/preload/preload2Render';
import { ElLink, ElMessage, ElMessageBox, ElNotification, ElProgress, NotificationHandle } from 'element-plus';
import { reactive, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import useSettings from './store/useSetting';
import useClient from './store/useClient';
import { Content, formatSize } from './utils';
const { t } = useI18n();
const settings = useSettings();//不能直接解构ref解包结果
const uploadInfo = reactive<Record<string, {
    data: UploadInfoType,
    notificationHandle?: NotificationHandle
}>>({});
const clientStore = useClient();
electronAPI.onInfo('upload', (info) => {//上传回执处理
    const { uuid, data = { status: 3, successNum: 0, errorNum: 0, total: 1 } } = info;
    if (uploadInfo[uuid]) {
        Object.assign(uploadInfo[uuid].data, data);
        if (data.status === 2 || data.status === 3) {
            setTimeout(() => {
                uploadInfo[uuid].notificationHandle!.close();
                if (data.status === 3) {
                    ElMessage.error(t('upload-err', { err: data.message || 'unkonw' }));
                } else {
                    ElMessage.success(t('upload-success'));
                }
            }, 1000)
        }
    } else {
        uploadInfo[uuid] = { data };//转换响应式
        uploadInfo[uuid].notificationHandle =
            ElNotification({
                title: t('uploadfile'),
                showClose: false,
                message: h(Content, null, {
                    default: () => [
                        h('div', {},
                            [
                                h('span', `${uploadInfo[uuid].data.name ? (uploadInfo[uuid].data.name + '-') : ''}${statusMap.value[uploadInfo[uuid].data.status]}`),
                                (!uploadInfo[uuid].data.name && (uploadInfo[uuid].data.status === 0 || uploadInfo[uuid].data.status === 1)) ? h(ElLink, {//脚本中的上传不做此设置
                                    type: 'danger',
                                    underline: false,
                                    style: { marginLeft: '16px' },
                                    onclick: async () => {
                                        const action = await ElMessageBox.confirm(t('confirm-cancel-task'), {}).catch(action => action);
                                        if (action === 'confirm') {
                                            clientStore.client?.abortUploadFile(uuid);
                                        }
                                    }
                                }, { default: () => t('Cancel') }) : null
                            ]
                        ),
                        h(ElProgress, {
                            status: uploadInfo[uuid].data.status === 2 ? 'success' : uploadInfo[uuid].data.status === 3 ? 'exception' : undefined,
                            percentage: Math.floor((uploadInfo[uuid].data.successNum / uploadInfo[uuid].data.total) * 100),
                            style: "width:250px;"
                        }, {
                            default: () => h('span', null,
                                uploadInfo[uuid].data.type === 'fileSize' ? `${formatSize(uploadInfo[uuid].data.successNum)}/${formatSize(uploadInfo[uuid].data.total)}` :
                                    `${uploadInfo[uuid].data.successNum}/${uploadInfo[uuid].data.total}`)
                        })
                    ]
                }),
                position: 'bottom-right',
                duration: 0,
            })
    }
})

const statusMap = computed(() => {
    return {
        0: t('Queuing'),
        1: t('Uploading'),
        2: t('Finished'),
        3: t('UploadError')
    }
})
</script>
