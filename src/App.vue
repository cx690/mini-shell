<template>
    <el-config-provider :locale="settings.ElLocale">
        <router-view></router-view>
    </el-config-provider>
</template>

<script setup lang="ts">
import type { UploadInfoType } from 'electron/preload2Render';
import { ElMessage, ElNotification, ElProgress, NotificationHandle } from 'element-plus';
import { reactive, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import useSettings from './store/useSetting';

const settings = useSettings();//不能直接解构ref解包结果
const uploadInfo = reactive<Record<string, {
    data: UploadInfoType,
    notificationHandle?: NotificationHandle
}>>({});

electronAPI.onInfo('upload', (info) => {
    const { uuid, data = { status: 3, successNum: 0, errorNum: 0, total: 1 } } = info;
    if (uploadInfo[uuid]) {
        Object.assign(uploadInfo[uuid].data, data);
        if (data.status === 2 || data.status === 3) {
            setTimeout(() => {
                uploadInfo[uuid].notificationHandle!.close();
                if (data.status === 3) {
                    ElMessage.error(data.message ?? `文件上传失败！失败数量：${data.errorNum}个`);
                } else {
                    if (data.errorNum === 0) {
                        ElMessage.success('文件上传成功！');
                    } else {
                        ElMessage.error(`文件上传成功：${data.successNum}个；  文件上传失败：${data.errorNum}个`);
                    }
                }
            }, 1000)
        }
    } else {
        uploadInfo[uuid] = { data };//转换响应式
        uploadInfo[uuid].notificationHandle =
            ElNotification({
                title: '文件上传',
                showClose: false,
                message: h(Content, null, {
                    default: () => [
                        h('div', `${uploadInfo[uuid].data.name ? (uploadInfo[uuid].data.name + '-') : ''}${statusMap.value[uploadInfo[uuid].data.status]}`),
                        h(ElProgress, {
                            status: uploadInfo[uuid].data.status === 2 ? 'success' : uploadInfo[uuid].data.status === 3 ? 'exception' : undefined,
                            percentage: Math.floor((uploadInfo[uuid].data.successNum / uploadInfo[uuid].data.total) * 100),
                            style: "width:250px;"
                        }, {
                            default: () => h('span', null, `${uploadInfo[uuid].data.successNum}/${uploadInfo[uuid].data.total}`)
                        })
                    ]
                }),
                position: 'bottom-right',
                duration: 0,
            })
    }
})
const { t } = useI18n();
const statusMap = computed(() => {
    return {
        0: t('Queuing'),
        1: t('Uploading'),
        2: t('Finished'),
        3: t('UploadError')
    }
})

function Content(props: any, ctx: any) {//ElNotification.message不是可以添加未依赖的函数，所以添加一个default插槽函数，这样可以跟踪数据变化，自动刷新
    return ctx.slots?.default?.();
}

</script>
