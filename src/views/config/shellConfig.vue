<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item :label="t('view-type')">
                    <el-radio-group v-model="state.formData.viewType" @change="onSearch">
                        <el-radio-button :label="t('Default')" value="default" />
                        <el-radio-button :label="t('Hidden')" value="hidden" />
                        <el-radio-button :label="t('All')" value="all" />
                    </el-radio-group>
                </el-form-item>
                <el-form-item :label="t('Sign')">
                    <el-input v-model.trim="state.formData.sign" class="g-input" @keypress.enter.native="onSearch"
                        :placeholder="t('enter-sign')" clearable @clear="onSearch" />
                </el-form-item>
                <el-form-item :label="t('script-config-name')">
                    <el-input v-model.trim="state.formData.scriptName" class="g-input" @keypress.enter.native="onSearch"
                        :placeholder="t('enter-script-config-name')" clearable @clear="onSearch" />
                </el-form-item>
                <el-form-item :label="t('group-name')">
                    <el-autocomplete v-model.trim="state.formData.group" class="g-input"
                        @keypress.enter.native="onSearch" clearable :placeholder="t('enter-group-name')"
                        :fetch-suggestions="getGroupOpt" @select="onSearch" @clear="onSearch" />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch" :icon="Search">{{ t('Search') }}</el-button>
                    <el-button type="primary" @click="onAdd" :icon="Plus">{{ t('New') }}</el-button>
                    <el-button @click="onExport" :icon="Download">{{ t('Export') }}</el-button>
                    <el-button type="danger" @click="onDelete" :icon="Delete">{{ t('Delete') }}</el-button>
                    <el-button v-if="state.formData.viewType !== 'all'" type="warning" @click="onSwitch"
                        :icon="state.formData.viewType === 'default' ? Hide : View">
                        {{ state.formData.viewType === 'default' ? t('Hide') : t('Show') }}
                    </el-button>
                </el-form-item>
            </el-form>
        </template>

        <Table :data="state.data" :row-key="rowKey" @selection-change="onSelect">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="uuid" :label="t('Sign')" width="320" show-overflow-tooltip />
            <el-table-column prop="scriptName" :label="t('script-config-name')" />
            <el-table-column prop="group" :label="t('group-name')" />
            <el-table-column prop="host" :label="t('relevancy-host')" />
            <el-table-column prop="action" :label="t('Action')">
                <template #default="{ row }">
                    <el-link type="primary" underline="never" @click="showDetail(row)">{{ t('Edit') }}</el-link>
                    <el-link type="primary" underline="never" @click="showDetail(row, true)">{{ t('Copy') }}</el-link>
                    <el-link type="primary" underline="never" v-if="row.baseScripts && row.baseScripts.length"
                        @click="showShell(row)">{{ t('View') }}</el-link>
                    <el-popconfirm :title="t('confirm-delete-item')" @confirm="delItem(row.id)">
                        <template #reference>
                            <el-link type="danger" underline="never">{{ t('Delete') }}</el-link>
                        </template>
                    </el-popconfirm>
                    <el-popconfirm :title="t('confirm-hidden-item')" @confirm="switchItems(row)" v-if="!row.hidden">
                        <template #reference>
                            <el-link type="warning" underline="never">{{ t('Hide') }}</el-link>
                        </template>
                    </el-popconfirm>
                    <el-link v-else type="warning" underline="never" @click="switchItems(row)">
                        {{ t('Show') }}
                    </el-link>
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
                    <el-autocomplete v-model.trim="state.currentRow.group" clearable
                        :placeholder="t('enter-group-name')" :fetch-suggestions="getGroupOpt" />
                </el-form-item>
                <el-form-item :label="t('relevancy-host')" prop="host">
                    <el-autocomplete v-model.trim="state.currentRow.host" clearable :placeholder="t('default-host')"
                        :fetch-suggestions="getHostOpt" />
                </el-form-item>
                <el-form-item prop="envVar" :rules="envRules">
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
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index"
                                    :label="item" :value="item" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('remote-dir-var-name')" prop="mainPath">
                            <el-select v-model="state.currentRow.mainPath" :placeholder="t('upload-d')" clearable
                                style="width: 300px;">
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index"
                                    :label="item" :value="item" />
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
                                {{ shellTypeEnum[1] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(2)">
                                {{ shellTypeEnum[2] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(3)">
                                {{ shellTypeEnum[3] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(5)">
                                {{ shellTypeEnum[5] }}
                            </el-button>
                            <el-button :icon="Plus" @click="addShellType(4)">
                                {{ shellTypeEnum[4] }}
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
                                <span>{{ shellTypeEnum[base.type] }} <span v-if="base.type === 4">
                                        {{ t('parallel-tasks') }}
                                    </span></span>
                                <div>
                                    <el-button :icon="RemoveFilled" type="danger" circle
                                        @click="removeShellType(num)"></el-button>
                                    <el-button class="sort-type-handle" :icon="Sort" circle></el-button>
                                </div>
                            </div>
                        </template>
                        <VueDraggable v-model="base.baseScripts" handle=".sort-handle" class="multi-row"
                            v-if="base.type === 1 || base.type === 2">
                            <div v-for="(item, index) in base.baseScripts" :key="item.key">
                                <template v-if="base.type === 2">
                                    <el-divider v-if="index > 0" />
                                    <el-form-item :label="t('script-type')">
                                        <el-select v-model="item.type" :placeholder="t('default-cmd')"
                                            style="width: 200px;">
                                            <el-option label="powershell" v-if="!isMac"
                                                value="powershell">powershell(Command)</el-option>
                                            <el-option label="ps1" v-if="!isMac" value="ps1">
                                                powershell(ps1 File)
                                            </el-option>
                                            <el-option label="bat" v-if="!isMac" value="bat">bat</el-option>
                                            <el-option label="sh" v-if="isMac" value="sh">sh</el-option>
                                            <el-option label="native" value="native">native</el-option>
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item :label="t('env-var')"
                                        :prop="`baseScripts.${num}.baseScripts.${index}.mergeEnv`">
                                        <el-radio-group :model-value="!!item.mergeEnv"
                                            @update:model-value="(value) => item.mergeEnv = !!value">
                                            <el-radio :value="false">{{ t('env-only') }}</el-radio>
                                            <el-radio :value="true">{{ t('env-merge') }}</el-radio>
                                        </el-radio-group>
                                    </el-form-item>
                                    <el-form-item label=" " :prop="`baseScripts.${num}.baseScripts.${index}.env`"
                                        :rules="envRules">
                                        <el-input type="textarea" :autosize="{ minRows: 1 }" v-model="item.env"
                                            style="word-break: break-all;width: 900px;" :placeholder="envPlacehold"
                                            clearable :spellcheck="false" />
                                    </el-form-item>
                                </template>
                                <el-form-item :prop="`baseScripts.${num}.baseScripts.${index}.value`"
                                    :rules="scriptRules" :label="t('script-code')">
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
                        <el-row v-else-if="base.type === 3" :gutter="8">
                            <el-col :span="12">
                                <el-form-item :label="t('local-dir')"
                                    :rules="{ required: true, message: t('enter-local-dir') }"
                                    :prop="`baseScripts.${num}.localFile`">

                                    <div class="flex-center">
                                        <el-input v-model="base.localFile" :placeholder="t('enter-local-dir')" clearable
                                            :spellcheck="false" />
                                        <el-dropdown @command="onPickLocalFile($event, base)">
                                            <el-button :icon="Location" size="small" circle>
                                            </el-button>
                                            <template #dropdown>
                                                <el-dropdown-menu>
                                                    <el-dropdown-item command="openFile">
                                                        {{ t('select-file') }}
                                                    </el-dropdown-item>
                                                    <el-dropdown-item command="openDirectory">
                                                        {{ t('select-dir') }}
                                                    </el-dropdown-item>
                                                </el-dropdown-menu>
                                            </template>
                                        </el-dropdown>
                                    </div>
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :rules="{ required: true, message: t('enter-remote-dir') }"
                                    :prop="`baseScripts.${num}.remoteDir`">
                                    <template #label>
                                        <div>
                                            <span class="script-config">
                                                {{ t('remote-dir') }}
                                                <el-tooltip placement="top">
                                                    <el-icon>
                                                        <QuestionFilled />
                                                    </el-icon>
                                                    <template #content>
                                                        <p>{{ t('remote-dir-suffix-tip') }}</p>
                                                    </template>
                                                </el-tooltip>：
                                            </span>
                                        </div>
                                    </template>
                                    <el-input v-model="base.remoteDir" :placeholder="t('enter-remote-dir')" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :prop="`baseScripts.${num}.exclude`">
                                    <template #label>
                                        <div>
                                            <span class="script-config">
                                                {{ t('ignore-rules') }}
                                                <el-tooltip placement="top">
                                                    <el-icon>
                                                        <QuestionFilled />
                                                    </el-icon>
                                                    <template #content>
                                                        <p>{{ t('ignore-rules-tip') }}</p>
                                                    </template>
                                                </el-tooltip>：
                                            </span>
                                        </div>
                                    </template>
                                    <el-input v-model="base.exclude" :placeholder="t('enter-ignore-rules')" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-row v-else-if="base.type === 5" :gutter="8">
                            <el-col :span="12">
                                <el-form-item :rules="{ required: true, message: t('enter-local-dir') }"
                                    :prop="`baseScripts.${num}.localFile`">
                                    <template #label>
                                        <div>
                                            <span class="script-config">
                                                {{ t('local-file-directory') }}
                                                <el-tooltip placement="top">
                                                    <el-icon>
                                                        <QuestionFilled />
                                                    </el-icon>
                                                    <template #content>
                                                        <p>{{ isWin32 ? t('download-local-dir-win-tip') :
                                                            t('remote-dir-suffix-tip') }}</p>
                                                    </template>
                                                </el-tooltip>：
                                            </span>
                                        </div>
                                    </template>
                                    <div class="flex-center">
                                        <el-input v-model="base.localFile"
                                            :placeholder="t('enter-local-file-directory')" clearable
                                            :spellcheck="false" />
                                        <el-button @click="onSelectDir(base)" :icon="Location" size="small" circle>
                                        </el-button>
                                    </div>
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :label="t('remote-dir-file')"
                                    :rules="{ required: true, message: t('enter-remote-dir-file') }"
                                    :prop="`baseScripts.${num}.remoteDir`">
                                    <el-input v-model="base.remoteDir" :placeholder="t('enter-remote-dir-file')"
                                        clearable :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item :prop="`baseScripts.${num}.exclude`">
                                    <template #label>
                                        <div>
                                            <span class="script-config">
                                                {{ t('ignore-rules') }}
                                                <el-tooltip placement="top">
                                                    <el-icon>
                                                        <QuestionFilled />
                                                    </el-icon>
                                                    <template #content>
                                                        <p>{{ t('ignore-rules-tip') }}</p>
                                                    </template>
                                                </el-tooltip>：
                                            </span>
                                        </div>
                                    </template>
                                    <el-input v-model="base.exclude" :placeholder="t('enter-ignore-rules')" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <div v-else-if="base.type === 4">
                            <template v-if="base.combine">
                                <el-row :gutter="8" v-for="(item, index) of base.combine">
                                    <el-col :span="20">
                                        <el-form-item :label="t('select-script')" :rules="combineRules"
                                            :prop="`baseScripts.${num}.combine.${index}.value`">
                                            <el-select v-model="item.value" :placeholder="t('pls-select-script')"
                                                style="width: 100%;" @change="setItemName(item)" filterable>
                                                <el-popover v-for="item of selectScripts" :key="item.id"
                                                    :value="item.uuid" :label="item.scriptName" placement="top"
                                                    :title="item.scriptName">
                                                    <p>{{ t('Sign') }}：{{ item.uuid }}</p>
                                                    <p>{{ t('group-name') }}：{{ item.group }}</p>
                                                    <p>{{ t('relevancy-host') }}：{{ item.host }}</p>
                                                    <template #reference>
                                                        <el-option :key="item.id" :value="item.uuid"
                                                            :label="item.scriptName">
                                                            {{ item.scriptName }}
                                                        </el-option>
                                                    </template>
                                                </el-popover>
                                            </el-select>
                                        </el-form-item>
                                    </el-col>
                                    <el-col :span="1">
                                        <el-button @click="showChild(item.value)" v-if="item.value" :icon="View"
                                            circle />
                                    </el-col>
                                    <el-col :span="3">
                                        <el-button :icon="CirclePlusFilled" @click="addCombineItem(num)" circle
                                            type="primary" v-if="index === base.combine.length - 1"></el-button>
                                        <el-button :icon="RemoveFilled" circle type="danger"
                                            @click="removeCombineItem(num, index)"></el-button>
                                    </el-col>
                                </el-row>
                            </template>
                        </div>
                        <el-result icon="error" v-else :title="t('unknown-script')" />
                    </el-card>
                </VueDraggable>
            </el-form>
            <template #footer>
                <el-button @click="state.showAdd = false">{{ t('Cancel') }}</el-button>
                <el-button type="primary" @click="onConfim">{{ t('Confirm') }}</el-button>
            </template>
        </el-dialog>
        <el-dialog v-model="state.shellShow" :title="`${t('format-script-detail')} - ${state.scriptName ?? ''}`"
            width="1000px" draggable>
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
import { addOrPut, deleteItemsById, findAll } from '@/utils/database';
import { CirclePlusFilled, RemoveFilled, Sort, Plus, Search, Download, Delete, QuestionFilled, View, Hide, Location } from '@element-plus/icons-vue';
import { VueDraggable } from 'vue-draggable-plus'
import { ServerListRecord } from '@/utils/tables';
import { exportData, formatScriptStr, noRepeat, useShellTypeEnum } from '@/utils';
import dayjs from 'dayjs';
import { ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';
import { useI18n } from 'vue-i18n';
import { checkLoop } from '@/utils/valid';
const isWin32 = electronAPI.platform === 'win32';
const { t } = useI18n();
const shellTypeEnum = useShellTypeEnum();
const addForm = ref<InstanceType<typeof ElForm>>();
const state = reactive({
    /** 全部shell数据 */
    shellList: [] as ShellListRecoed[],
    data: [] as ShellListRecoed[],
    total: 0,
    formData: {
        viewType: 'default' as 'default' | 'hidden' | 'all',
        sign: '',
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
    scriptName: '',
    shellStr: '',
    selects: [] as ShellListRecoed[],
    showInset: false,
})
function validaterJSON(rule: any, value: string, callback: any) {
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

const combineRules = computed(() => ({
    required: true,
    message: t('pls-select-script')
}))

const configPleaseHold = computed(() => `${t('enter-json')}：
{
    "mainPath": "/root/apps"
}`);

const envPlacehold = computed(() => `${t('enter-json')}：{"NODE_ENV": "production","JAVA_HOME": "C:/Java/jdk1.8.0_351"}`);

onMounted(onSearch);

function onSearch() {
    getTableData();
}

async function getTableData() {
    state.selects = [];
    let data = await findAll<ShellListRecoed>('shellList');
    state.shellList = data;
    if (state.formData.sign) {
        data = data.filter(item => item.uuid?.includes(state.formData.sign));
    }
    if (state.formData.scriptName) {
        data = data.filter(item => item.scriptName?.includes(state.formData.scriptName));
    }
    if (state.formData.group) {
        data = data.filter(item => item.group?.includes(state.formData.group));
    }
    if (state.formData.viewType === 'default') {
        data = data.filter(item => !item.hidden);
    } else if (state.formData.viewType === 'hidden') {
        data = data.filter(item => !!item.hidden);
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
    param.envVar = envVar ? JSON.stringify(envVar, null, '\t') : '';
    param.baseScripts?.forEach((base: any) => {
        if (base.type === 2) {
            base.baseScripts?.forEach((item: any) => {
                if (item.env && typeof item.env === 'object') {
                    item.env = JSON.stringify(item.env, null, '\t');
                }
            })
        }
    });
    state.parseEnvVarOpt = envVar ? Object.keys(envVar) : [];
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

function addShellType(type: 1 | 2 | 3 | 4 | 5) {
    if (type === 1 || type === 2) {
        state.currentRow.baseScripts.push({
            type,
            key: v4(),
            baseScripts: [{ key: v4(), value: '' }]
        })
    } else if (type === 3) {
        state.currentRow.baseScripts.push({
            type,
            key: v4(),
            baseScripts: [],
            localFile: '',
            remoteDir: ''
        })
    } else if (type === 4) {
        state.currentRow.baseScripts.push({
            type,
            key: v4(),
            baseScripts: [],
            combine: [{ value: '', name: '' }]
        })
    } else if (type === 5) {
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

function addCombineItem(num: number) {
    state.currentRow.baseScripts[num].combine?.push({ value: '', name: '' });
}

function removeCombineItem(num: number, index: number) {
    state.currentRow.baseScripts[num].combine?.splice(index, 1);
    if (state.currentRow.baseScripts[num].combine?.length === 0) {
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
    await deleteItemsById("shellList", id);
    getTableData();
}

async function onSwitch() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const action = await ElMessageBox.confirm(t('confirm-switch-hidden-item', { num: state.selects.length }), t('Change-confirm'), {
        type: 'warning'
    }).catch(action => action);
    if (action === 'confirm') {
        switchItems(state.selects);
    }
}

async function switchItems(row: ShellListRecoed | ShellListRecoed[]) {
    if (!Array.isArray(row)) {
        row = [row];
    }
    for (const item of row) {
        await addOrPut({ storeName: 'shellList', type: 'put', record: { ...JSON.parse(JSON.stringify(item)), hidden: !item.hidden } }).catch((err) => {
            ElMessage.error(err + '');
        });
    }
    getTableData();
}

async function onDelete() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const action = await ElMessageBox.confirm(t('delete-confirm-content', { num: state.selects.length }), t('delete-confirm'), {
        type: 'warning'
    }).catch(action => action);
    if (action === 'confirm') {
        delItem(state.selects.map(item => item.id!));
    }
}

async function onConfim() {
    const valid = await addForm.value!.validate().catch(() => false);
    if (!valid) return;
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
    const record = {
        ...state.currentRow,
        uuid: state.currentRow.uuid ? state.currentRow.uuid : v4(),//添加唯一键
        baseScripts,
        ...(state.currentRow.envVar ? { envVar: JSON.parse(state.currentRow.envVar) } : {}),
    } as ShellListRecoed;
    const { pass } = await checkLoop(record, t);
    if (!pass) return;
    try {
        await addOrPut({ storeName: 'shellList', type: state.currentRow.id ? 'put' : 'add', record });
        ElMessage.success(t('op-success'));
        getTableData();
        state.showAdd = false;
    } catch (err) {
        ElMessage.error(err + '');
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
    let env: Record<string, any> | undefined;
    if (typeof row.envVar === 'string') {
        if (row.envVar.trim() !== '') {
            try {
                env = JSON.parse(row.envVar);
            } catch (err) {
                ElMessage.error(t('var-json-error'));
                return;
            }
        }
    } else {
        env = row.envVar;
    }
    if (!row.baseScripts?.length) {
        ElMessage.error(t('view-after-set'));
        return;
    };
    state.shellShow = true;
    state.scriptName = row.scriptName;
    state.shellStr = formatScriptStr(env, row.baseScripts);
}

function onSelect(rows: ShellListRecoed[]) {
    state.selects = rows;
}

function rowKey(row: ShellListRecoed) {
    return (row.id || row.uuid) + '';
}

const isMac = electronAPI.platform === 'darwin';

const selectScripts = computed(() => {
    const { shellList, currentRow } = state;
    if (!currentRow) return [];
    const { uuid } = currentRow;
    if (!uuid) {
        return shellList;
    }
    return shellList?.filter(item => item.uuid !== uuid) || [];
})

function setItemName(item: { name: string, value: string }) {
    const { value } = item;
    if (!value) {
        item.name = '';
        return;
    }
    item.name = selectScripts.value.find(shell => shell.uuid === value)?.scriptName || '';
}

function showChild(value?: string) {
    if (!value) return;
    const item = selectScripts.value.find(shell => shell.uuid === value);
    if (!item) return;
    showShell(item);
}

async function onSelectDir(base: ShellListRecoed<'edit'>['baseScripts'][number], properties: 'openFile' | 'openDirectory' = 'openDirectory') {
    const res = await electronAPI.showOpenDialog({
        title: t('select-dir'),
        properties: [properties]
    })
    if (!res.canceled) {
        base.localFile = res.filePaths[0];
    }
}

async function onPickLocalFile(command: 'openFile' | 'openDirectory', base: ShellListRecoed<'edit'>['baseScripts'][number]) {
    await onSelectDir(base, command);
}

</script>
<style lang="less" scoped>
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

.flex-center {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}
</style>