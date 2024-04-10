<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item :label="t('script-config-name')">
                    <el-input v-model.trim="state.formData.scriptName" class="g-input" @keypress.enter.native="onSearch"
                        :placeholder="t('enter-script-config-name')" clearable />
                </el-form-item>
                <el-form-item :label="t('group-name')">
                    <el-autocomplete v-model.trim="state.formData.group" class="g-input" @keypress.enter.native="onSearch"
                        clearable :placeholder="t('enter-group-name')" :fetch-suggestions="getGroupOpt" @select="onSearch"
                        @clear="onSearch" />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch" :icon="Search">{{ t('Search') }}</el-button>
                    <el-button type="primary" @click="onAdd" :icon="Plus">{{ t('New') }}</el-button>
                    <el-button @click="onExport" :icon="Download">{{ t('Export') }}</el-button>
                    <el-button type="danger" @click="onDelete" :icon="Delete">{{ t('Delete') }}</el-button>
                </el-form-item>
            </el-form>
        </template>

        <Table :data="state.data" :row-key="rowKey" @selection-change="onSelect">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="scriptName" :label="t('script-config-name')" />
            <el-table-column prop="group" :label="t('group-name')" />
            <el-table-column prop="host" :label="t('relevancy-host')" />
            <el-table-column prop="action" :label="t('Action')">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">{{ t('Edit') }}</el-link>
                    <el-link type="primary" :underline="false" @click="showDetail(row, true)">{{ t('Copy') }}</el-link>
                    <el-link type="primary" :underline="false" v-if="row.baseScripts && row.baseScripts.length"
                        @click="showShell(row)">{{ t('View') }}</el-link>
                    <el-popconfirm :title="t('confirm-delete-item')" @confirm="delItem(row.id)">
                        <template #reference>
                            <el-link type="danger" :underline="false">{{ t('Delete') }}</el-link>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </Table>
        <el-dialog v-if="state.showAdd" :title="state.currentRow?.id ? t('edit-script-config') : t('add-script-config')"
            v-model="state.showAdd" width="1200px" :close-on-click-modal="false">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules">
                <el-form-item :label="t('script-config-name')" prop="scriptName">
                    <el-input v-model.trim="state.currentRow.scriptName" clearable
                        :placeholder="t('enter-script-config-name')" />
                </el-form-item>
                <el-form-item :label="t('group-name')" prop="group">
                    <el-autocomplete v-model.trim="state.currentRow.group" clearable :placeholder="t('enter-group-name')"
                        :fetch-suggestions="getGroupOpt" />
                </el-form-item>
                <el-form-item :label="t('relevancy-host')" prop="host">
                    <el-autocomplete v-model.trim="state.currentRow.host" clearable :placeholder="t('default-host')"
                        :fetch-suggestions="getHostOpt" />
                </el-form-item>
                <el-form-item prop="envVar">
                    <template #label>
                        <div>
                            <span class="script-config">
                                {{ t('script-variable-config') }}
                                <el-tooltip placement="top">
                                    <el-icon>
                                        <QuestionFilled />
                                    </el-icon>
                                    <template #content>
                                        <p>{{ t('script-variable-config-desc') }}</p>
                                    </template>
                                </el-tooltip>：
                            </span>
                            <br />
                            <el-button type="primary" @click="state.showInset = true">
                                {{ t('built-in-variablle') }}
                            </el-button>
                        </div>
                    </template>
                    <el-input type="textarea" :autosize="{ minRows: 6 }" v-model="state.currentRow.envVar"
                        :placeholder="configPleaseHold" clearable @blur="handleFormat" :spellcheck="false" />
                </el-form-item>
                <el-row>
                    <el-col :span="12">
                        <el-form-item :label="t('local-dir-var-name')" prop="localDir">
                            <el-select v-model="state.currentRow.localDir" :placeholder="t('start-d')" clearable
                                style="width: 300px;">
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('remote-dir-var-name')" prop="mainPath">
                            <el-select v-model="state.currentRow.mainPath" :placeholder="t('upload-d')" clearable
                                style="width: 300px;">
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item style="margin-bottom: 8px;">
                    <template #label>
                        <div>
                            <span class="script-config">
                                {{ t('script-config') }}
                                <el-tooltip placement="top">
                                    <el-icon>
                                        <QuestionFilled />
                                    </el-icon>
                                    <template #content>
                                        <p>1.{{ t('excute-sort') }}</p>
                                        <p>2.{{ t('excute-var-desc') }}</p>
                                    </template>
                                </el-tooltip>：
                            </span>
                            <el-button :icon="Plus" @click="addShellType(1)">
                                {{ t('Add ') }}{{ shellTypeEnum[1] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(2)">
                                {{ t('Add ') }}{{ shellTypeEnum[2] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(3)">
                                {{ t('Add ') }}{{ shellTypeEnum[3] }}
                            </el-button>
                            <el-button type="primary" @click="showShell(state.currentRow)" :icon="View">
                                {{ t('view-format-script') }}
                            </el-button>
                        </div>
                    </template>
                </el-form-item>
                <VueDraggable v-model="state.currentRow.baseScripts" handle=".sort-type-handle" class="multi-row">
                    <el-card class="shells" v-for="(base, num) of state.currentRow.baseScripts" :key="base.key">
                        <template #header>
                            <div class="card-header">
                                <span>{{ shellTypeEnum[base.type] }}</span>
                                <div>
                                    <el-button :icon="RemoveFilled" type="danger" circle
                                        @click="removeShellType(num)"></el-button>
                                    <el-button class="sort-type-handle" :icon="Sort" circle></el-button>
                                </div>
                            </div>
                        </template>
                        <VueDraggable v-model="base.baseScripts" handle=".sort-handle" class="multi-row"
                            v-if="base.type !== 3">
                            <div v-for="(item, index) in base.baseScripts" :key="item.key">
                                <template v-if="base.type === 2">
                                    <el-divider v-if="index > 0" />
                                    <el-form-item :label="t('script-type')">
                                        <el-select v-model="item.type" :placeholder="t('default-cmd')" style="width: 200px;">
                                            <el-option label="powershell" value="powershell">powershell</el-option>
                                            <el-option label="bat" value="bat">bat</el-option>
                                            <el-option label="native" value="native">native</el-option>
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item :label="t('env-var')"
                                        :prop="`baseScripts.${num}.baseScripts.${index}.env`" :rules="envRules">
                                        <el-input type="textarea" :autosize="{ minRows: 1 }" v-model="item.env"
                                            style="word-break: break-all;width: 700px;" :placeholder="envPlacehold"
                                            clearable :spellcheck="false" />
                                    </el-form-item>
                                </template>
                                <el-form-item :prop="`baseScripts.${num}.baseScripts.${index}.value`" :rules="scriptRules"
                                    :label="t('script-code')">
                                    <el-row class="row-content" :gutter="8">
                                        <el-col :span="20">
                                            <el-input type="textarea" :autosize="{ minRows: 2 }" v-model="item.value"
                                                style="word-break: break-all;"
                                                :placeholder="base.type === 1 ? t('enter-remote-script') : t('enter-remote-script-powershell')"
                                                clearable :spellcheck="false" />
                                        </el-col>
                                        <el-col :span="4">
                                            <el-button :icon="CirclePlusFilled" @click="addScriptItem(num)" circle
                                                type="primary" v-if="index === base.baseScripts.length - 1"></el-button>
                                            <el-button :icon="RemoveFilled" circle type="danger"
                                                @click="removeScriptItem(num, index)"></el-button>
                                            <el-button class="sort-handle" :icon="Sort" circle></el-button>
                                        </el-col>
                                    </el-row>
                                </el-form-item>
                            </div>
                        </VueDraggable>
                        <el-row v-else :gutter="8">
                            <el-col :span="12">
                                <el-form-item :label="t('local-dir')"
                                    :rules="{ required: true, message: t('enter-local-dir') }"
                                    :prop="`baseScripts.${num}.localFile`">
                                    <el-input v-model="base.localFile" :placeholder="t('enter-local-dir')" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :label="t('remote-dir')"
                                    :rules="{ required: true, message: t('enter-remote-dir') }"
                                    :prop="`baseScripts.${num}.remoteDir`">
                                    <el-input v-model="base.remoteDir" :placeholder="t('enter-remote-dir')" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </el-card>
                </VueDraggable>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">{{ t('Cancel') }}</el-button>
                    <el-button type="primary" @click="onConfim">{{ t('Confirm') }}</el-button>
                </span>
            </template>
        </el-dialog>
        <el-dialog v-model="state.shellShow" :title="t('format-script-detail')" width="1000px" draggable>
            <el-input readonly :model-value="state.shellStr" type="textarea" :rows="20" resize="none" />
        </el-dialog>
        <el-dialog v-model="state.showInset" :title="t('built-in-detail')" draggable>
            <div> NOW_TIME: 'YYYY-MM-DD~HH:mm:ss' // {{ t('excute-time') }}</div>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElForm, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import { CirclePlusFilled, RemoveFilled, Sort, Plus, Search, Download, Delete, QuestionFilled, View } from '@element-plus/icons-vue';
import { VueDraggable } from 'vue-draggable-plus'
import { ServerListRecord } from '@/utils/tables';
import { exportData, formatScriptStr, noRepeat, useShellTypeEnum } from '@/utils';
import dayjs from 'dayjs';
import { ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const shellTypeEnum = useShellTypeEnum();
const addForm = ref<InstanceType<typeof ElForm>>();
const state = reactive({
    data: [] as ShellListRecoed[],
    total: 0,
    formData: {
        scriptName: '',
        group: '',
    },
    currentRow: {
        id: null,
        scriptName: '',
        envVar: '{"mainPath":"/data/Component/shujuzichanpingguchengshiduan/assetmain"}',
        mainPath: '',
        baseScripts: [],
        group: '',
        uuid: '',
        host: '',
    } as ShellListRecoed<'edit'>,
    showAdd: false,
    parseEnvVarOpt: [] as string[],
    shellShow: false,
    shellStr: '',
    selects: [] as ShellListRecoed[],
    showInset: false,
})
const validaterJSON = (rule: any, value: string, callback: any) => {
    try {
        JSON.parse(value); // 尝试解析 JSON
        callback(); // 解析成功，调用 callback() 表示验证通过
    } catch (error) {
        callback(new Error(t('json-error'))); // 解析失败，调用 callback() 传递错误信息
    }
}
const rules = computed(() => ({
    scriptName: {
        required: true,
        message: t('enter-script-config-name')
    },
    envVar: [
        {
            required: true,
            message: t('enter-script-var-config')
        },
        { validator: validaterJSON, trigger: 'blur' }

    ],
}))

const scriptRules = computed(() => ({
    required: true,
    message: t('enter-script-config'),
    trigger: 'blur',
}))

const envRules = {
    validator: (rule: any, value: string | undefined, callback: any) => {
        value = value?.trim?.();
        if (value) {
            return validaterJSON(rule, value, callback);
        }
        callback();
    },
    trigger: 'blur'
}

const configPleaseHold = computed(() => `${t('enter-json')}：
{
    "mainPath": "/root/apps"
}`);

const envPlacehold = computed(() => `${t('enter-json')}：{"NODE_ENV": "production"}`);

onMounted(onSearch);

function onSearch() {
    getTableData();
}

async function getTableData() {
    state.selects = [];
    let data = await findAll<ShellListRecoed>('shellList');
    if (state.formData.scriptName) {
        data = data.filter(item => item.scriptName?.includes(state.formData.scriptName))
    }
    if (state.formData.group) {
        data = data.filter(item => item.group?.includes(state.formData.group))
    }
    state.data = data;
}

function showDetail(row: ShellListRecoed, isCopy = false) {
    state.showAdd = true;
    const { envVar } = row
    const param: any = JSON.parse(JSON.stringify(row));
    if (isCopy) {
        delete param.id;
        delete param.uuid;
    }
    param.envVar = JSON.stringify(envVar, null, '\t');
    param.baseScripts?.forEach((base: any) => {
        if (base.type === 2) {
            base.baseScripts?.forEach((item: any) => {
                if (item.env && typeof item.env === 'object') {
                    item.env = JSON.stringify(item.env, null, '\t');
                }
            })
        }
    });
    state.parseEnvVarOpt = Object.keys(JSON.parse(param.envVar));
    state.currentRow = param;
}

function handleFormat() {
    if (state.currentRow?.envVar) {
        try {
            state.parseEnvVarOpt = Object.keys(JSON.parse(state.currentRow.envVar))
        } catch (e) {
            ElMessage.error('脚本变量配置错误！');
        }
    }
}

function addShellType(type: 1 | 2 | 3) {
    if (type !== 3) {
        state.currentRow.baseScripts.push({
            type,
            key: v4(),
            baseScripts: [{ key: v4(), value: '' }]
        })
    } else {
        state.currentRow.baseScripts.push({
            type,
            key: v4(),
            baseScripts: [],
            localFile: '',
            remoteDir: ''
        })
    }
}

function removeShellType(num: number) {
    state.currentRow.baseScripts.splice(num, 1);
}

function addScriptItem(num: number) {
    state.currentRow.baseScripts[num].baseScripts.push({ key: dayjs().format('YYYY-MM-DD HH:mm:ss') + ('-' + Math.floor(1000 * Math.random())), value: '' })
}

function removeScriptItem(num: number, index: number) {
    state.currentRow.baseScripts[num].baseScripts.splice(index, 1);
    if (state.currentRow.baseScripts[num].baseScripts.length === 0) {
        state.currentRow.baseScripts.splice(num, 1);
    }
}

function onAdd() {
    state.showAdd = true;
    state.currentRow = {
        id: null,
        scriptName: '',
        envVar: '{"mainPath":""}',
        mainPath: '',
        baseScripts: [],
        uuid: '',
    }
}

function onExport() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const text = JSON.stringify({
        shellList: state.selects.map(({ id, ...rest }) => rest),
    }, null, 5)
    exportData(text, { defaultPath: 'shellList' });
}

async function delItem(id: number | number[]) {
    const db = await getDatabase();
    await deleteItems(db.transaction(["shellList"], 'readwrite').objectStore("shellList"), id);
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
    const baseScripts: ShellListRecoed<'edit'>['baseScripts'] = JSON.parse(JSON.stringify(state.currentRow.baseScripts));
    if (baseScripts?.length) {
        baseScripts.forEach(base => {
            base.baseScripts?.forEach(item => {
                if (item.env && typeof item.env === 'string') {
                    item.env = JSON.parse(item.env);
                }
            })
        })
    }
    const param = {
        ...state.currentRow,
        uuid: state.currentRow.uuid ? state.currentRow.uuid : v4(),//添加唯一键
        baseScripts,
        envVar: JSON.parse(state.currentRow.envVar),
    }
    const valid = await addForm.value!.validate().catch(() => false);
    if (valid) {
        const db = await getDatabase();
        const transaction = db.transaction(['shellList'], 'readwrite');
        const objectStore = transaction.objectStore("shellList");
        let request: any;
        if (state.currentRow.id) {
            request = objectStore.put(param);
        } else {
            const { id, ...rest } = param
            request = objectStore.add(rest);
        }
        request.onsuccess = () => {
            ElMessage.success('操作成功！');
            getTableData();
            state.showAdd = false;
        };
    }
}

function getHostOpt(queryString: string, cb: any) {
    findAll<ServerListRecord>('serverList').then(list => {
        cb(noRepeat(list.map(item => ({ value: item.host })).filter(item => queryString ? !!(item.value?.includes(queryString)) : true)));
    })
}

function getGroupOpt(queryString: string, cb: any) {
    findAll<ShellListRecoed>('shellList').then(list => {
        cb(noRepeat(list.map(item => ({ value: item.group })).filter(item => queryString ? !!(item.value?.includes(queryString)) : true)));
    })
}

function showShell(row: ShellListRecoed | ShellListRecoed<'edit'>) {
    let env: Record<string, any>;
    if (typeof row.envVar === 'string') {
        try {
            env = JSON.parse(row.envVar) || {};
        } catch (err) {
            ElMessage.error('脚本变量配置设置错误！');
            return;
        }
    } else {
        env = row.envVar;
    }
    if (!row.baseScripts?.length) {
        ElMessage.error('请设置脚本后查看！');
        return;
    };
    state.shellShow = true;
    state.shellStr = formatScriptStr(env, row.baseScripts, t);
}

function onSelect(rows: ShellListRecoed[]) {
    state.selects = rows;
}

function rowKey(row: ShellListRecoed) {
    return (row.id || row.uuid) + '';
}
</script>
<style lang="less" scoped >
.multi-row {
    width: 100%;
    min-width: 900px;

    :deep(.el-form-item) {
        margin-bottom: 24px;

        .row-content {
            align-items: center;
            width: 100%;
        }
    }
}

.shells {
    width: 100%;

    .card-header {
        display: flex;
        justify-content: flex-start;
        gap: 16px;
        align-items: center;
    }

    &:not(:last-child) {
        margin-bottom: 8px;
    }
}

.script-config {
    display: inline-flex;
    align-items: center;
}
</style>