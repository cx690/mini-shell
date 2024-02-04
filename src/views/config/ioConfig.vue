<template>
    <base-page>
        <div class="main-container">
            <ElCard>
                <el-button type="primary" @click="onInport" :icon="Upload">{{ t('import-data') }}</el-button>
            </ElCard>
            <ElCard>
                <el-button :loading="state.exportConfigLoading" @Click="exportAllConfig" :icon="Download">
                    {{ t('export-all') }}
                </el-button>
            </ElCard>
            <ElCard>
                <el-button :loading="state.exportLogsLoading" @Click="exportExcuteRecord" :icon="Download">
                    {{ t('export-logs') }}
                </el-button>
            </ElCard>
            <ElCard>
                <el-button type="danger" @Click="state.showDeleteLogs = true" :icon="Delete">{{ t('delete-logs')
                }}</el-button>
            </ElCard>
        </div>
        <el-dialog :title="t('delete-logs')" v-model="state.showDeleteLogs">
            <div class="delete-info">
                <el-icon>
                    <WarningFilled />
                </el-icon>
                <span>{{ t('confirm-delete-logs') }}</span>
            </div>
            <template #footer>
                <el-button type="primary" @click="exportAndDelete">{{ t('export-and-delete-logs') }}</el-button>
                <el-button type="danger" @click="deleteLogs">{{ t('delete-all-logs') }}</el-button>
                <el-button @Click="state.showDeleteLogs = false">{{ t('cancel') }}</el-button>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { ElMessage, ElCard } from 'element-plus';
import { WarningFilled, Upload, Download, Delete } from '@element-plus/icons-vue';
import { getDatabase, exportTables, clearStore } from '@/utils/database';
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const state = reactive({
    showDeleteLogs: false,
    exportConfigLoading: false,
    exportLogsLoading: false,
})

function exportAllConfig() {
    state.exportConfigLoading = true;
    exportTables(t, {}, ['serverList', 'shellList']).finally(() => {
        state.exportConfigLoading = false;
    });
}

async function exportExcuteRecord() {
    state.exportLogsLoading = true;
    return await exportTables(t, { defaultPath: 'logs.json' }, ['excuteList']).finally(() => {
        state.exportLogsLoading = false;
    });
}

async function exportAndDelete() {
    const status = await exportExcuteRecord();
    status === true && deleteLogs();
}

async function deleteLogs() {
    await clearStore('excuteList');
    state.showDeleteLogs = false;
}

async function onInport() {
    const res = await electronAPI.showOpenDialog({
        title: t('select-config-file'),
        properties: ['openFile'],
        filters: [{ extensions: ['json'], name: '' }]
    })
    if (!res.canceled) {
        const path = res.filePaths[0];
        if (!/\.json$/.test(path)) {
            ElMessage.error(t('select-error-json'));
            return;
        }
        try {
            const text = await electronAPI.readFile(path);
            const data = JSON.parse(text);
            const db = await getDatabase();
            for (const storeName in data) {
                try {
                    const records: Record<string, any>[] = data[storeName];
                    const transaction = db.transaction([storeName], 'readwrite');
                    const objectStore = transaction.objectStore(storeName);
                    for (let i = records.length - 1; i >= 0; i--) {//导出是逆序导出（最新的在最上面，写入要逆序）
                        const record = records[i];
                        objectStore.add(record);
                    }
                    ElMessage.success(t('store-add-success', { storeName }));
                } catch (err) {
                    ElMessage.error(t('store-add-error', { storeName, err: err + '' }));
                }
            }
        } catch (err) {
            ElMessage.error(err + '');
        }
    }
}
</script>
<style lang="less" scoped >
.main-container {
    display: flex;
    flex-direction: row;
    gap: 10px;
}

.delete-info {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    font-size: 16px;

    >.el-icon {
        color: var(--el-color-warning, #e6a23c);
        font-size: 1.2em;
    }
}
</style>