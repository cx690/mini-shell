<template>
    <base-page>
        <div class="main-container">
            <ElCard>
                <el-button type="primary" @click="onInport">导入数据</el-button>
            </ElCard>
            <ElCard>
                <el-button :loading="state.exportConfigLoading" @Click="exportAllConfig">导出所有配置</el-button>
            </ElCard>
            <ElCard>
                <el-button :loading="state.exportLogsLoading" @Click="exportExcuteRecord">导出运行日志</el-button>
            </ElCard>
            <ElCard>
                <el-button type="danger" @Click="state.showDeleteLogs = true">删除运行日志</el-button>
            </ElCard>
        </div>
        <el-dialog title="删除日志" v-model="state.showDeleteLogs">
            <div class="delete-info">
                <el-icon>
                    <WarningFilled />
                </el-icon>
                <span>您确认要删除所有运行日志吗？数据删除后不可恢复，如有需要请确定日志已导出！</span>
            </div>
            <template #footer>
                <el-button type="primary" @click="exportAndDelete">导出并删除所有日志</el-button>
                <el-button type="danger" @click="deleteLogs">删除所有日志</el-button>
                <el-button @Click="state.showDeleteLogs = false">取消</el-button>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { ElMessage, ElCard } from 'element-plus';
import { WarningFilled } from '@element-plus/icons-vue';
import { getDatabase, exportTables, clearStore } from '@/utils/database';
import { reactive } from 'vue';
const state = reactive({
    showDeleteLogs: false,
    exportConfigLoading: false,
    exportLogsLoading: false,
})

function exportAllConfig() {
    state.exportConfigLoading = true;
    exportTables({}, ['serverList', 'shellList']).finally(() => {
        state.exportConfigLoading = false;
    });
}

async function exportExcuteRecord() {
    state.exportLogsLoading = true;
    await exportTables({ defaultPath: 'logs.json' }, ['excuteList']).finally(() => {
        state.exportLogsLoading = false;
    });
}

async function exportAndDelete() {
    await exportExcuteRecord();
    deleteLogs();
}

async function deleteLogs() {
    await clearStore('excuteList');
    state.showDeleteLogs = false;
}

async function onInport() {
    const res = await electronAPI.showOpenDialog({
        title: '选择导入文件',
        properties: ['openFile'],
        filters: [{ extensions: ['json'], name: '' }]
    })
    if (!res.canceled) {
        const path = res.filePaths[0];
        if (!/\.json$/.test(path)) {
            ElMessage.error('请选择.json扩展的文件！');
            return;
        }
        try {
            const text = await window.electronAPI.readFile(path);
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
                    ElMessage.success(`数据表"${storeName}"添加成功！`);
                } catch (err) {
                    ElMessage.error(`数据表"${storeName}"添加失败！原因：${err}`);
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