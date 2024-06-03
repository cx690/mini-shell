<template>
    <el-config-provider :locale="ElLocale">
        <router-view></router-view>
    </el-config-provider>
</template>

<script setup lang="ts">
import type { UploadInfoType } from 'electron/preload2Render';
import { ElMessage, ElMessageBox, ElNotification, ElProgress, NotificationHandle } from 'element-plus';
import { reactive, h, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { onBeforeUnmount } from 'vue';
const allLocales = import.meta.glob('/node_modules/element-plus/es/locale/lang/*.mjs');
const allDayjsLocales = import.meta.glob('/node_modules/dayjs/locale/*.js');
const { locale } = useI18n();
const ElLocale = ref(zhCn);

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
                    default: () => h(ElProgress, {
                        status: uploadInfo[uuid].data.status === 2 ? 'success' : uploadInfo[uuid].data.status === 3 ? 'exception' : undefined,
                        percentage: Math.floor((uploadInfo[uuid].data.successNum / uploadInfo[uuid].data.total) * 100),
                        style: "width:250px;"
                    }, {
                        default: () => h('span', null, `${uploadInfo[uuid].data.successNum}/${uploadInfo[uuid].data.total}`)
                    },
                    )
                }),
                position: 'bottom-right',
                duration: 0,
            })
    }
})

function Content(props: any, ctx: any) {//ElNotification.message不是可以添加未依赖的函数，所以添加一个default插槽函数，这样可以跟踪数据变化，自动刷新
    return ctx.slots?.default?.();
}

function storage(e: WindowEventMap['storage']) {
    const { key } = e;
    if (key === 'locale') {
        locale.value = localStorage.locale;
        loadLocale();
    }
}

function loadLocale() {
    const file = locale.value ?? 'zh-cn';
    if (file === 'zh-cn') {
        ElLocale.value = zhCn;
        return;
    };
    const key = `/node_modules/element-plus/es/locale/lang/${file}.mjs`;
    if (key in allLocales) {
        allLocales[key]().then((res: any) => {//加载对应i18n设置
            ElLocale.value = res.default;
        })
    } else {
        ElMessageBox.alert(`Can't find lang '${file}' in element-plus, please make the file name the same to be supported. See https://element-plus.org/en-US/guide/i18n.html#cdn-usage `);
    }

    const dayjsKey = `/node_modules/dayjs/locale/${file}.js`;
    if (dayjsKey in allDayjsLocales) {
        allDayjsLocales[dayjsKey]();//加载dayjs时间设置
    }
}

loadLocale();

window.addEventListener('storage', storage)

onBeforeUnmount(() => {
    window.removeEventListener('storage', storage)
})

</script>
