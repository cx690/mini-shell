<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item label='名称'>
                    <el-input v-model="state.formData.name" class="g-input" @keypress.enter.native="onSearch"
                        placeholder="请输入名称" clearable />
                </el-form-item>
                <el-form-item label='主机'>
                    <el-input v-model="state.formData.host" class="g-input" @keypress.enter.native="onSearch"
                        placeholder="请输入主机" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch" :icon="Search">查询</el-button>
                    <el-button type="primary" @click="onAdd" :icon="Plus">新增</el-button>
                    <el-button @click="onExport" :icon="Download">导出</el-button>
                    <el-button type="danger" @click="onDelete" :icon="Delete">删除</el-button>
                </el-form-item>
            </el-form>
        </template>

        <Table :data="state.data" row-key="id" @selection-change="onSelect" :row-class-name="activeClassName">
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="host" label="主机" />
            <el-table-column prop="port" label="端口" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="desc" label="说明" />
            <el-table-column prop="action" label="操作">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">修改</el-link>
                    <el-link type="primary" :underline="false" @click="copyItem(row)">复制</el-link>
                    <el-popconfirm title="确定要删除这条数据吗？" @confirm="delItem(row.id)">
                        <template #reference>
                            <el-link type="danger" :underline="false">删除</el-link>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </Table>
        <el-dialog v-if="state.showAdd" :title="state.currentRow?.id ? '修改会话设置' : '新增会话设置'" v-model="state.showAdd"
            width="600px" :close-on-click-modal="false">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules" label-width="100px">
                <el-form-item label="名称" prop="name">
                    <el-input v-model.trim="state.currentRow.name" placeholder="请输入名称" clearable />
                </el-form-item>
                <el-form-item label="主机" prop="host">
                    <el-input v-model.trim="state.currentRow.host" placeholder="请输入主机IP/域名地址" clearable />
                </el-form-item>
                <el-form-item label="端口" prop="port">
                    <el-input v-model="state.currentRow.port" type="number" placeholder="请输入端口号" clearable />
                </el-form-item>
                <el-form-item label="用户名" prop="username">
                    <el-input v-model.trim="state.currentRow.username" placeholder="请输入用户名" clearable />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-input type.trim="password" v-model="state.currentRow.password" placeholder="请输入密码" clearable />
                </el-form-item>
                <el-form-item label="描述" prop="desc">
                    <el-input v-model="state.currentRow.desc" placeholder="请输入描述" :maxLength="20" clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">取消</el-button>
                    <el-button type="primary" @click="onTest">连接测试</el-button>
                    <el-button type="primary" @click="onConfim">确认</el-button>
                </span>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElForm, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { Search, Plus, Download, Delete } from '@element-plus/icons-vue';
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import useClient from '@/store/useClient';
import { ServerListRecord } from '@/utils/tables';
import { v4 } from 'uuid';
import { exportData } from '@/utils';
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
const rules = {
    host: {
        required: true,
        message: '请输入主机'
    },
    port: {
        required: true,
        message: '请输入主机'
    },
    username: {
        required: true,
        message: '请输入用户名'
    },
    password: {
        required: true,
        message: '请输入密码'
    },
}
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
        ElMessage.error('请选择数据！');
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
        ElMessage.error('请选择数据！');
        return;
    }
    const action = await ElMessageBox.confirm(`确定要删除选中的${state.selects.length}条数据吗？`, '删除确认', {
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
            ElMessage.success('操作成功！');
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
