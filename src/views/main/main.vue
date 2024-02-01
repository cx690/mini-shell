<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item label='名称'>
                    <el-input v-model="state.formData.name" @keypress.enter.native="onSearch" placeholder="请输入名称" />
                </el-form-item>
                <el-form-item label='主机'>
                    <el-input v-model="state.formData.host" @keypress.enter.native="onSearch" placeholder="请输入主机" />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch">查询</el-button>
                </el-form-item>
            </el-form>
        </template>
        <template #extra v-if="clientStore.config && clientStore.status === 2">
            <RouterLink :to="{ name: 'push' }" style="line-height: 30px;">
                <el-link>已连接：{{ clientStore.config.name ?? '未命名' }} 主机：{{ clientStore.config.host ?? '未知' }}</el-link>
            </RouterLink>
        </template>
        <Table :data="state.data" :row-class-name="activeClassName">
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="host" label="主机" />
            <el-table-column prop="port" label="端口" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="desc" label="说明" show-overflow-tooltip />
            <el-table-column prop="action" label="操作">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">查看</el-link>
                    <el-link type="primary" :underline="false" @click="onLink(row)">连接服务器</el-link>
                </template>
            </el-table-column>
        </Table>
        <el-dialog title="设置查看" v-model="state.showAdd" width="600px">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules" label-width="100px">
                <el-form-item label="名称" prop="name">
                    <el-input v-model.trim="state.currentRow.name" readonly placeholder="请输入名称" clearable />
                </el-form-item>
                <el-form-item label="主机" prop="host">
                    <el-input v-model.trim="state.currentRow.host" readonly placeholder="请输入主机IP/域名地址" clearable />
                </el-form-item>
                <el-form-item label="端口" prop="port">
                    <el-input v-model="state.currentRow.port" readonly type="number" placeholder="请输入端口号" clearable />
                </el-form-item>
                <el-form-item label="用户名" prop="username">
                    <el-input v-model.trim="state.currentRow.username" readonly placeholder="请输入用户名" clearable />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-input type.trim="password" v-model="state.currentRow.password" readonlyplaceholder="请输入密码"
                        clearable />
                </el-form-item>
                <el-form-item label="描述" prop="desc">
                    <el-input v-model="state.currentRow.desc" placeholder="请输入描述" readonly :maxLength="20" clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">确认</el-button>
                </span>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { onActivated, onMounted, reactive } from 'vue';
import { ElForm, ElMessageBox } from 'element-plus';
import { findAll } from '@/utils/database';
import { useRouter } from 'vue-router';
import { ServerListRecord } from '@/utils/tables';
import useClient from '@/store/useClient';
import Table from '@/components/table.vue';

const state = reactive({
    data: [] as ServerListRecord[],
    total: 0,
    formData: {
        name: '',
        host: '',
    },
    currentRow: {
        id: null as any,
        name: '',
        host: '',
        port: 22,
        username: 'root',
        password: '',
        desc: ''
    } as ServerListRecord,
    showAdd: false,
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
onActivated(onSearch);

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

const router = useRouter();
const clientStore = useClient();
async function onLink(row: any) {
    if (clientStore.status === 2) {
        if (row.id === clientStore.config?.id) {
            router.push({ name: 'push' });
            return;
        }
        const action = await ElMessageBox.confirm(`当前已连接主机${clientStore.config?.host ?? '未命名'}，确定要切换服务连接吗？(如果要保持并建立新连接，可以新开窗口)`, '切换服务器').catch(action => action);
        if (action === 'confirm') {
            clientStore.reset();
        } else {
            return;
        }
    }
    if (clientStore.status === 1) {
        clientStore.reset();
    }
    clientStore.connect(row);
    router.push({ name: 'push' });
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
