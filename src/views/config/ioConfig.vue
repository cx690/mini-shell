<template>
    <base-page>
        <div class="main-container">
            <ElCard>
                <el-button type="primary" @click="onImport" :icon="Upload">{{ t('import-data') }}</el-button>
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

        <el-dialog :title="t('the-same-sign')" :modelValue="!!quest" :closeOnClickModal="false" :show-close="false"
            :close-on-press-escape="false" width="1100px">
            <div class="delete-info">
                <el-icon>
                    <QuestionFilled />
                </el-icon>
                <span>
                    {{
                        t('confirm-same-sign', {
                            dataName: info.dataName || 'unkonwn',
                            tableName: info.tableName || 'unknown',
                            sign: info.sign || ''
                        })
                    }}
                </span>
            </div>
            <template #footer>
                <el-button type="warning" @click="quest?.(1)">{{ t('Cover') }}</el-button>
                <el-button type="warning" @click="quest?.(2)">{{ t('Always-cover') }}</el-button>
                <el-button type="primary" @click="quest?.(3)">{{ t('Merge-new') }}</el-button>
                <el-button type="primary" @click="quest?.(4)">{{ t('Always-merge-new') }}</el-button>
                <el-button @click="quest?.(5)">{{ t('Skip') }}</el-button>
                <el-button @click="quest?.(6)">{{ t('Always-skip') }}</el-button>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { ElMessage, ElCard } from 'element-plus';
import { WarningFilled, QuestionFilled, Upload, Download, Delete } from '@element-plus/icons-vue';
import { getDatabase, exportTables, clearStore, findAll, AllStore, AllStoreType, addOrPut } from '@/utils/database';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { v4 } from 'uuid';
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
/**
 * 0 始终询问 默认操作合并
 * 1 覆盖
 * 2 始终覆盖
 * 3 合并
 * 4 始终合并（重置标识符）
 * 5 跳过
 * 6 始终跳过
 */
type ActionType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
let action: ActionType = 0;
const info = reactive({
    dataName: '',
    tableName: '',
    sign: ''
})
const quest = ref<null | ((value: ActionType | PromiseLike<ActionType>) => void)>(null);
const tableMap = computed(() => {
    const map: Record<AllStoreType, string> = {
        serverList: t('serverList-name'),
        shellList: t('shellList-name'),
        excuteList: t('excuteList-name')
    }
    return map;
})
async function onImport() {
    action = 0;
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
            const storeNames = Object.keys(data) as unknown as typeof AllStore;
            let addNum = 0;
            let modifyNum = 0;
            for (const storeName of storeNames) {
                if (AllStore.includes(storeName)) {
                    try {
                        const source = await findAll(storeName);
                        const records: Record<string, any>[] = data[storeName];
                        for (let i = records.length - 1; i >= 0; i--) {//导出是逆序导出（最新的在最上面，写入要逆序）
                            const record = records[i];
                            const { uuid } = record;
                            const find = uuid ? source.find(item => item.uuid === uuid) : null;
                            if (find) {
                                if (action === 0) {
                                    info.dataName = storeName === 'shellList' ? find.scriptName : storeName === 'excuteList' ? find.shellName : find.name;
                                    info.sign = find.uuid;
                                    info.tableName = tableMap.value[storeName];
                                    const p = Promise.withResolvers<ActionType>();
                                    quest.value = p.resolve;
                                    action = await p.promise;
                                    quest.value = null;
                                }
                                if (action === 1 || action === 2) {//覆盖操作                                    
                                    record.id = find.id;
                                    await addOrPut({
                                        db,
                                        type: 'put',
                                        record,
                                        storeName,
                                    })
                                    modifyNum++;
                                } else if (action === 0 || action === 3 || action === 4) {//合并操作
                                    record.uuid = v4();
                                    await addOrPut({
                                        db,
                                        type: 'add',
                                        record,
                                        storeName,
                                    })
                                    addNum++;
                                }
                                if (action === 1 || action === 3 || action === 5) {
                                    action = 0;//继续询问
                                }
                            } else {
                                if (!uuid) {
                                    record.uuid = v4();
                                }
                                await addOrPut({
                                    db,
                                    type: 'add',
                                    record,
                                    storeName,
                                })
                                addNum++;
                            }
                        }
                    } catch (err) {
                        ElMessage.error(t('store-add-error', { storeName: tableMap.value[storeName], err: err + '' }));
                        ElMessage.info(t('add-modify-num', { addNum, modifyNum }));
                    }
                } else {
                    ElMessage.warning(t('unknown-table-ignore', { storeName: tableMap.value[storeName] }));
                }
            }
            ElMessage.success(t('add-modify-num', { addNum, modifyNum }));
        } catch (err) {
            ElMessage.error(err + '');
        }
    }
}
</script>
<style lang="less" scoped>
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