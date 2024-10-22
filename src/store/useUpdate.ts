import type { ProgressInfo, UpdateCheckResult } from 'electron-updater';
import { ElMessage, ElMessageBox } from 'element-plus';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { compareVersions } from 'compare-versions';

const useUpdate = defineStore('update', () => {
    const shouldUpdate = ref(sessionStorage.getItem('shouldUpdate'));
    const updateInfo = ref<UpdateCheckResult | null>(null)
    const progressInfo = ref<null | ProgressInfo>(null)
    const download = ref<0 | 1 | 2>(0);
    const { t } = useI18n();
    const checking = ref(false);
    checkForUpdates();
    async function checkForUpdates(notice = false, force = false) {
        if (checking.value || download.value) return;
        if (process.env.NODE_ENV === 'development') {
            notice && ElMessage.success(t('no-new-found'));
            return '0';
        }
        if (shouldUpdate.value === null || force) {
            checking.value = true;
            const info = await window.electronAPI.checkForUpdates().catch(err => {
                notice && console.error(err);
                return null;
            });
            checking.value = false;
            if (info) {
                updateInfo.value = info;
                if (compareVersions(info.updateInfo.version, process.env.version) >= 1) {
                    shouldUpdate.value = '1';
                    if (notice) {
                        const action = await ElMessageBox.confirm(t('is-setup-now', { version: `v${info.updateInfo.version}` })).catch(action => action);
                        if (action === 'confirm') {
                            electronAPI.downloadUpdate().catch(err => {
                                ElMessage.error(err);
                            });
                        }
                    }
                }
            }
        }
        if (shouldUpdate.value !== '1') {
            shouldUpdate.value = '0';
        }
        sessionStorage.setItem('shouldUpdate', shouldUpdate.value ?? '0');
        if (shouldUpdate.value === '0' && notice) {
            ElMessage.success(t('no-new-found'));
        }
        return shouldUpdate.value;
    }

    window.electronAPI.onInfo('download-progress', (info) => {
        progressInfo.value = info.data;
        download.value = 1;
    })
    window.electronAPI.onInfo('update-downloaded', async () => {
        download.value = 2;
    })
    return {
        shouldUpdate,
        download,
        updateInfo,
        checking,
        checkForUpdates,
        progressInfo
    }
})

export default useUpdate;
