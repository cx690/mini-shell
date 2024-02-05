<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item :label="t('Name')">
                    <el-input v-model="state.formData.name" class="g-input" @keypress.enter.native="onSearch"
                        :placeholder="t('enter-name')" clearable />
                </el-form-item>
                <el-form-item :label="t('Host')">
                    <el-input v-model="state.formData.host" class="g-input" @keypress.enter.native="onSearch"
                        :placeholder="t('enter-host')" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch" :icon="Search">{{ t('Search') }}</el-button>
                    <el-button type="primary" @click="onAdd" :icon="Plus">{{ t('New') }}</el-button>
                    <el-button @click="onExport" :icon="Download">{{ t('Export') }}</el-button>
                    <el-button type="danger" @click="onDelete" :icon="Delete">{{ t('Delete') }}</el-button>
                </el-form-item>
            </el-form>
        </template>

        <Table :data="state.data" row-key="id" @selection-change="onSelect" :row-class-name="activeClassName">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" :label="t('Name')" />
            <el-table-column prop="host" :label="t('Host')" />
            <el-table-column prop="port" :label="t('Port')" />
            <el-table-column prop="username" :label="t('user-name')" />
            <el-table-column prop="desc" :label="t('desc')" show-overflow-tooltip />
            <el-table-column prop="action" :label="t('Action')">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">{{ t('Edit') }}</el-link>
                    <el-link type="primary" :underline="false" @click="copyItem(row)">{{ t('Copy') }}</el-link>
                    <el-popconfirm :title="t('confirm-delete-item')" @confirm="delItem(row.id)">
                        <template #reference>
                            <el-link type="danger" :underline="false">{{ t('Delete') }}</el-link>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </Table>
        <el-dialog v-if="state.showAdd"
            :title="state.currentRow?.id ? t('edit-connection-config') : t('add-connection-config')" v-model="state.showAdd"
            width="600px" :close-on-click-modal="false">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules" label-width="100px">
                <el-form-item :label="t('Name')" prop="name">
                    <el-input v-model.trim="state.currentRow.name" :placeholder="t('enter-name')" clearable />
                </el-form-item>
                <el-form-item :label="t('Host')" prop="host">
                    <el-input v-model.trim="state.currentRow.host" :placeholder="t('enter-host')" clearable />
                </el-form-item>
                <el-form-item :label="t('Port')" prop="port">
                    <el-input v-model="state.currentRow.port" type="number" :placeholder="t('enter-port')" clearable />
                </el-form-item>
                <el-form-item :label="t('user-name')" prop="username">
                    <el-input v-model.trim="state.currentRow.username" :placeholder="t('enter-username')" clearable />
                </el-form-item>
                <el-form-item :label="t('Password')" prop="password">
                    <el-input type.trim="password" v-model="state.currentRow.password" :placeholder="t('enter-password')"
                        clearable />
                </el-form-item>
                <el-form-item :label="t('desc')" prop="desc">
                    <el-input v-model="state.currentRow.desc" :placeholder="t('enter-desc')" :maxLength="20" clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">{{ t('cancel') }}</el-button>
                    <el-button type="primary" @click="onTest">{{ t('connection-test') }}</el-button>
                    <el-button type="primary" @click="onConfim">{{ t('Confirm') }}</el-button>
                </span>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElForm, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { Search, Plus, Download, Delete } from '@element-plus/icons-vue';
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import useClient from '@/store/useClient';
import { ServerListRecord } from '@/utils/tables';
import { v4 } from 'uuid';
import { exportData } from '@/utils';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const addForm = ref<InstanceType<typeof ElForm>>();
const state = reactive({
    data: [] as ServerListRecord[],
    total: 0,
    formData: {
        name: '',
        host: '',
    },
    currentRow: {
        id: null,
        name: '',
        host: '',
        port: 22,
        username: 'root',
        password: '',
        desc: ''
    } as ServerListRecord,
    showAdd: false,
    selects: [] as ServerListRecord[]
})
const rules = computed(() => ({
    host: {
        required: true,
        message: t('enter-host')
    },
    port: {
        required: true,
        message: t('enter-port')
    },
    username: {
        required: true,
        message: t('enter-username')
    },
    password: {
        required: true,
        message: t('enter-password')
    },
}))
onMounted(onSearch);

function onSearch() {
    getTableData();
}

async function getTableData() {
    let data = await findAll<ServerListRecord>('serverList');
    if (state.formData.host) {
        data = data.filter(item => item.host?.includes(state.formData.host))
    }
    if (state.formData.name) {
        data = data.filter(item => item.name?.includes(state.formData.name))
    }
    state.data = data;
}

function showDetail(row: ServerListRecord) {
    state.showAdd = true;
    state.currentRow = { ...row };
}

function copyItem(row: ServerListRecord) {
    state.showAdd = true;
    const item = { ...row };
    delete item.id;
    item.uuid = '';
    state.currentRow = item;
}

function onAdd() {
    state.showAdd = true;
    state.currentRow = {
        name: '',
        host: '',
        port: 22,
        username: 'root',
        password: '',
        uuid: '',
        desc: ''
    }
}

function onExport() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const text = JSON.stringify({
        serverList: state.selects.map(({ id, ...rest }) => rest),
    }, null, 5)
    exportData(text, { defaultPath: 'serverList' });
}

async function delItem(id: number | number[]) {
    const db = await getDatabase();
    await deleteItems(db.transaction(["serverList"], 'readwrite').objectStore("serverList"), id);
    getTableData();
}

async function onDelete() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const action = await ElMessageBox.confirm(t('delete-confirm-content'), t('delete-confirm'), {
        type: 'warning'
    }).catch(action => action);
    if (action === 'confirm') {
        delItem(state.selects.map(item => item.id!));
    }
}

async function onConfim() {
    const valid = await addForm.value!.validate().catch(() => false);
    if (valid) {
        const db = await getDatabase();
        const transaction = db.transaction(['serverList'], 'readwrite');
        const objectStore = transaction.objectStore("serverList");
        let request: any;
        if (state.currentRow.id) {
            request = objectStore.put({ ...state.currentRow, uuid: state.currentRow.uuid ? state.currentRow.uuid : v4() });
        } else {
            delete state.currentRow.id;
            request = objectStore.add({ ...state.currentRow, uuid: state.currentRow.uuid ? state.currentRow.uuid : v4() });
        }
        request.onsuccess = () => {
            ElMessage.success(t('action-success'));
            state.showAdd = false;
            getTableData();
        };
    }
}
const clientStore = useClient();
async function onTest() {
    const valid = await addForm.value!.validate().catch(() => false);
    if (valid) {
        clientStore.test(state.currentRow);
    }
}

function onSelect(rows: ServerListRecord[]) {
    state.selects = rows;
}

function activeClassName({ row }: { row: ServerListRecord }) {
    if (clientStore.config?.id && row.id === clientStore.config.id) {
        return clientStore.status === 2 ? 'active' : clientStore.status === 1 ? 'linking' : '';
    }
    return '';
}
</script>
<style lang="less" scoped >
:deep(.active) {
    color: var(--el-color-danger);
}

:deep(.linking) {
    color: var(--el-color-warning);
}
</style>
