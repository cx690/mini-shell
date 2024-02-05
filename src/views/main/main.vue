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
                </el-form-item>
            </el-form>
        </template>
        <template #extra v-if="clientStore.config && clientStore.status === 2">
            <RouterLink :to="{ name: 'excute' }" style="line-height: 30px;">
                <el-link>
                    {{ t('connected') }}：{{ clientStore.config.name ?? t('unnamed') }} {{ t('host') }}：{{
                        clientStore.config.host ?? t('unknown') }}
                </el-link>
            </RouterLink>
        </template>
        <Table :data="state.data" :row-class-name="activeClassName">
            <el-table-column prop="name" :label="t('Name')" />
            <el-table-column prop="host" :label="t('Host')" />
            <el-table-column prop="port" :label="t('Port')" />
            <el-table-column prop="username" :label="t('user-name')" />
            <el-table-column prop="desc" :label="t('desc')" show-overflow-tooltip />
            <el-table-column prop="action" :label="t('Action')">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">{{ t('View') }}</el-link>
                    <el-link type="primary" :underline="false" @click="onLink(row)">{{ t('Connect') }}</el-link>
                </template>
            </el-table-column>
        </Table>
        <el-dialog :title="t('connection-view')" v-model="state.showAdd" width="600px">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules" label-width="100px">
                <el-form-item :label="t('Name')" prop="name">
                    <el-input v-model.trim="state.currentRow.name" :placeholder="t('enter-name')" clearable readonly />
                </el-form-item>
                <el-form-item :label="t('Host')" prop="host">
                    <el-input v-model.trim="state.currentRow.host" :placeholder="t('enter-host')" clearable readonly />
                </el-form-item>
                <el-form-item :label="t('Port')" prop="port">
                    <el-input v-model="state.currentRow.port" type="number" :placeholder="t('enter-port')" clearable
                        readonly />
                </el-form-item>
                <el-form-item :label="t('user-name')" prop="username">
                    <el-input v-model.trim="state.currentRow.username" :placeholder="t('enter-username')"
                        clearablereadonly />
                </el-form-item>
                <el-form-item :label="t('Password')" prop="password">
                    <el-input type.trim="password" v-model="state.currentRow.password" :placeholder="t('enter-password')"
                        clearable readonly />
                </el-form-item>
                <el-form-item :label="t('desc')" prop="desc">
                    <el-input v-model="state.currentRow.desc" :placeholder="t('enter-desc')" :maxLength="20" clearable
                        readonly />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">{{ t('Confirm') }}</el-button>
                </span>
            </template>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { computed, onActivated, onMounted, reactive } from 'vue';
import { ElForm, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { findAll } from '@/utils/database';
import { useRouter } from 'vue-router';
import { ServerListRecord } from '@/utils/tables';
import useClient from '@/store/useClient';
import Table from '@/components/table.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
            router.push({ name: 'excute' });
            return;
        }
        const action = await ElMessageBox.confirm(t('switch-already-connected', { host: clientStore.config?.host ?? t('unnamed') }), t('switch-connect')).catch(action => action);
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
    router.push({ name: 'excute' });
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
