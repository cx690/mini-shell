<template>
    <BasePage full>
        <template #form>
            <div class="status">
                <template v-if="clientStore.config">
                    <span>{{ t('current-connect') }}：{{ clientStore.config?.name ?? t('unnamed') }}</span>
                    <span>{{ t('Host') }}：{{ clientStore.config?.host ?? '0.0.0.0' }}</span>
                    <span class="connect-status">
                        {{ t('connect-status') }}：{{ StatusEnum[clientStore.status] }}
                    </span>
                    <el-button class="mgL10" v-if="clientStore.config && clientStore.status === 0" type="primary"
                        @click="reLink" :icon="Connection">{{ t('reconnect') }}</el-button>
                </template>
                <RouterLink :to="{ name: 'main' }" class="mgL10">
                    <el-button type="primary" :icon="Switch">
                        {{ clientStore.config ? t('switch-connect') : t('select-connect') }}
                    </el-button>
                </RouterLink>
                <el-popconfirm v-if="clientStore.status === 2 || clientStore.status === 1"
                    :title="t('confirm-stop', { host: clientStore.config?.host ?? t('unknown') })"
                    @confirm="clientStore.disConnect">
                    <template #reference>
                        <el-button class="mgL10" :icon="Close">{{ t('disconnect') }}</el-button>
                    </template>
                </el-popconfirm>
                <el-button type="primary" v-if="clientStore.status === 2" class="mgL10" @click="state.showUpload = true"
                    :icon="Upload">{{ t('uploadfile') }}</el-button>
                <el-button type="primary" v-if="clientStore.status === 2" class="mgL10"
                    @click="state.showDownload = true" :icon="Download">{{ t('downloadfile') }}</el-button>
            </div>
        </template>

        <el-tabs v-model="state.activeName" class="excute-tabs" type="border-card" addable @edit="handleTabsEdit">
            <el-tab-pane label="Execute" name="Execute">
                <el-button v-show="state.currentRecord" @click="state.currentRecord = null" style="margin: 4px 10px;">
                    {{ t('Back') }}
                </el-button>
                <template v-if="state.currentRecord">
                    <span>{{ t('script-name') }}：</span>
                    <span>{{ state.currentRecord.shellName }}</span>
                    <span class="mgL10">{{ t('de-host') }}：</span>
                    <span>{{ state.currentRecord.host }}</span>
                    <span class="mgL10">{{ t('excute-status') }}：</span>
                    <Status :status="state.currentRecord.status" />
                </template>
                <Output ref="outputRef" v-if="state.currentRecord" />
                <div style="padding: 24px;" v-show="!state.currentRecord">
                    <el-form :model="formData" inline>
                        <el-form-item :label="t('group-select')">
                            <el-select v-model="formData.group" :placeholder="t('pls-select')" clearable
                                style="width: 160px;" filterable>
                                <el-option v-for="(item, index) of state.groupList" :key="index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                        <el-form-item :label="t('script-select')" class="script-btns">
                            <el-select-v2 v-model="formData.selectShellCode" @change="onSelectShell"
                                :placeholder="t('pls-select')" style="width: 220px;" :options="shellListGroup"
                                filterable clearable>
                                <template #header>
                                    <header class="sholl-all">
                                        <span> {{ t('Show-All') }}</span>
                                        <el-switch class="mgL10" v-model="state.showAll" />
                                    </header>
                                </template>
                            </el-select-v2>
                            <el-button class="mgL10" @click="reFresh" :icon="Refresh">
                                {{ t('refresh-data') }}
                            </el-button>
                            <el-button type="primary" @click="checkAndExcute()" :disabled="!formData.selectShell"
                                :icon="CaretRight">
                                {{ t('excute-script') }}
                            </el-button>
                            <el-popover :title="t('select-excute-script')" :width="550"
                                v-if="formData.selectShell && formData.selectShell.baseScripts && formData.selectShell.baseScripts.length">
                                <template #reference>
                                    <el-button class="mgL10" type="primary" :icon="Filter">
                                        {{ t('excute-part-script') }}
                                    </el-button>
                                </template>
                                <el-checkbox-group v-model="(formData.checkList as any)" class="select-shell-scripts">
                                    <el-checkbox v-for="(item, index) of formData.selectShell.baseScripts" :label="item"
                                        :value="item" :key="item.key">
                                        <el-tooltip placement="top">
                                            <span>{{ (index + 1) + '、' + shellTypeEnum[item.type] }}</span>
                                            <template #content>
                                                <div class="select-shell-str">
                                                    <pre>{{ formatScriptStr(formData.selectShell.envVar, [item]) }}</pre>
                                                </div>
                                            </template>
                                        </el-tooltip>
                                    </el-checkbox>
                                </el-checkbox-group>
                                <div>
                                    <el-button type="primary" :disabled="!formData.checkList.length"
                                        @click="checkAndExcute(formData.checkList)" :icon="CaretRight">
                                        {{ t('excute-select') }}
                                    </el-button>
                                </div>
                            </el-popover>
                            <el-button @click="showShell(formData.selectShell)" class="mgL10"
                                :disabled="!formData.selectShell" :icon="View">
                                {{ t('View-script') }}
                            </el-button>
                            <el-dropdown @command="openPowershell" v-if="isWin32">
                                <el-button class="mgL10">{{ t('open-local-term') }}</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="cmd">{{ t('Open ') }}CMD</el-dropdown-item>
                                        <el-dropdown-item command="powershell">
                                            {{ t('Open ') }}Powershell
                                        </el-dropdown-item>
                                        <el-dropdown-item command="code" v-if="formData.selectShell?.localDir">
                                            {{ t('Open ') }}VSCode
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                            <el-popconfirm :title="t('confirm-close-windows')"
                                v-if="state.excuteData.length && win.close === false && isWin32" @confirm="closeWin">
                                <template #reference>
                                    <el-button type="danger" class="mgL10" :icon="SwitchButton">
                                        {{ t('close-windows-btn') }}
                                    </el-button>
                                </template>
                            </el-popconfirm>
                            <el-button class="mgL10" v-if="win.close" @click="onCancelColose" :icon="Remove">
                                {{ t('cancel-close-windows-btn') }}
                            </el-button>
                        </el-form-item>
                    </el-form>
                    <div class="table-title">
                        {{ t('excute-logs') }}：
                        <el-radio-group v-model="state.hostType" size="small">
                            <el-radio-button label="currentShell" value="currentShell">
                                {{ t('current-shell') }}
                            </el-radio-button>
                            <el-radio-button label="currentGroup" value="currentGroup">
                                {{ t('current-group') }}
                            </el-radio-button>
                            <el-radio-button label="currentHost" value="currentHost">
                                {{ t('current-host') }}
                            </el-radio-button>
                            <el-radio-button label="currentConnect" value="currentConnect">
                                {{ t('currentConnect') }}
                            </el-radio-button>
                            <el-radio-button label="all" value="all">{{ t('all-logs') }}</el-radio-button>
                        </el-radio-group>
                        <span class="mgL10">
                            <el-button @click="onExport" size="small" :icon="Download">{{ t('Export') }}</el-button>
                            <el-button type="danger" size="small" @click="onDelete" :icon="Delete">
                                {{ t('Delete') }}
                            </el-button>
                        </span>
                    </div>
                    <Table :data="history" :row-key="rowKey" @selection-change="onSelect" ref="table">
                        <el-table-column type="selection" width="55" :selectable="selectable" />
                        <el-table-column prop="shellName" :label="t('script-name')" show-overflow-tooltip />
                        <el-table-column prop="host" :label="t('de-host')" width="140px;" />
                        <el-table-column prop="excuteGroup" :label="t('group-by')" show-overflow-tooltip />
                        <el-table-column prop="excuteType" :label="t('excuted-script')" width="80px"
                            show-overflow-tooltip>
                            <template #default="{ row }">
                                {{ !row.excuteType ? t('All') : row.excuteType === 1 ? t('part') : row.excuteType }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="startTime" :label="t('excute-start-time')" width="170px;" />
                        <el-table-column prop="endTime" :label="t('excute-end-time')" width="170px;">
                            <template #default="{ row }">
                                <span v-if="row.endTime">{{ utilTime(row.endTime) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="time" :label="t('excute-duration')" width="160px">
                            <template #default="{ row }">
                                <span v-if="row.startTime && row.endTime">
                                    {{ computedTime(row.startTime, row.endTime) }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" :label="t('Status')" width="100px">
                            <template #default="{ row }">
                                <Status :status="row.status" />
                            </template>
                        </el-table-column>
                        <el-table-column :label="t('Action')">
                            <template #default="{ row }">
                                <el-link type="primary" underline="never" @click="onShowLogs(row)">
                                    {{ t('Log') }}
                                </el-link>
                                <el-link type="primary" underline="never" v-if="row.status === 0"
                                    @click="showTargetShell(row)">
                                    {{ t('View') }}
                                </el-link>
                                <el-popconfirm :title="t('confirm-cancel-task')" v-if="row.status === 0 && !row.pid"
                                    @confirm="cancelExecute(row)">
                                    <template #reference>
                                        <el-link type="danger" underline="never">
                                            {{ t('cancel-excute') }}
                                        </el-link>
                                    </template>
                                </el-popconfirm>
                                <el-popconfirm :title="t('confirm-delete-item')" v-if="row.id"
                                    @confirm="delItem(row.id)">
                                    <template #reference>
                                        <el-link type="danger" underline="never">{{ t('Delete') }}</el-link>
                                    </template>
                                </el-popconfirm>
                            </template>
                        </el-table-column>
                    </Table>
                </div>
            </el-tab-pane>
            <el-tab-pane :label="t('sftp')" name="SFTP" lazy>
                <Sftp />
            </el-tab-pane>
            <el-tab-pane key="handle-terminal" name="Terminal" class="terminal-pane" lazy>
                <template #label>
                    <span>{{ t('Terminal') }}</span>
                    <el-icon class="refresh-icon" @click="initShell()" v-if="state.activeName === 'Terminal'">
                        <Refresh />
                    </el-icon>
                </template>
                <Terminal ref="holdTermRef" autoRefresh />
            </el-tab-pane>
            <el-tab-pane v-for="(item, index) of formData.terminals" :key="item.shellNum" :name="index" closable
                class="terminal-pane">
                <template #label>
                    <span>{{ t('Terminal') + ' ' + item.shellNum }}</span>
                    <el-icon class="refresh-icon" @click="initShell(index)" v-if="state.activeName === index">
                        <Refresh />
                    </el-icon>
                </template>
                <Terminal ref="terminalsRef" init />
            </el-tab-pane>
        </el-tabs>
        <el-dialog v-model="state.shellShow" :title="`${t('format-script-detail')} - ${state.scriptName ?? ''}`"
            width="1000px" draggable>
            <el-input readonly :model-value="state.shellStr" type="textarea" :rows="20" resize="none" />
        </el-dialog>
        <el-dialog v-model="state.showUpload" :title="t('uploadfile')" width="800px" :close-on-click-modal="false">
            <el-form :model="formData" ref="formRef" :rules="rules" label-width="160px">
                <el-form-item :label="t('select-upload-file')" prop="file">
                    <el-button type="primary" @click="onSelectFile('openFile')">{{ t('select-file') }}</el-button>
                    <el-button type="primary" @click="onSelectFile('openDirectory')">{{ t('select-dir') }}</el-button>
                </el-form-item>
                <el-form-item prop="file" :label="t('current-file')" required>
                    <el-input v-model="formData.file" :placeholder="t('pls-select-file-dir')" style="width: 520px;" />
                </el-form-item>
                <el-form-item :label="t('remote-path-dir')" prop="uploadDir">
                    <el-input v-model="formData.uploadDir" :placeholder="t('enter-upload-dir')" style="width: 520px;" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button type="primary" @click="onUpload" :loading="state.uploadLoading">
                    {{ t('uploadfile') }}
                </el-button>
                <el-button @click="state.showUpload = false">{{ t('Cancel') }}</el-button>
            </template>
        </el-dialog>
        <el-dialog v-model="state.showDownload" :title="t('downloadfile')" width="900px" :close-on-click-modal="false">
            <el-form :model="formData" ref="formDownLoadRef" :rules="downLoadRules" label-width="180px">
                <el-form-item :label="t('select-save')" prop="locaDir">
                    <el-button type="primary" @click="onSelectDir">{{ t('select-dir') }}</el-button>
                </el-form-item>
                <el-form-item prop="locaDir" :label="t('select-save')" required>
                    <el-input v-model="formData.locaDir" :placeholder="t('enter-save-dir')" style="width: 520px;" />
                    <el-button class="mgL10" v-if="formData.locaDir" @click="openDir">{{ t('open-dir') }}</el-button>
                </el-form-item>
                <el-form-item :label="t('remote-file')" prop="downloadFile">
                    <el-input v-model="formData.downloadFile" :placeholder="t('enter-remote-file-path')"
                        style="width: 520px;" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button type="primary" @click="onDownLoad" :loading="state.uploadLoading">
                    {{ t('downloadfile') }}
                </el-button>
                <el-button @click="state.showDownload = false">{{ t('Cancel') }}</el-button>
            </template>
        </el-dialog>
    </BasePage>
</template>
<script setup lang="ts">
import useClient, { useStatusEnum } from '@/store/useClient';
import { ElMessage, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { Download, Delete, Refresh, Upload, CaretRight, View, Switch, Close, Connection, SwitchButton, Remove, Filter } from '@element-plus/icons-vue';
import { onBeforeUnmount, reactive, ref, nextTick, computed, watchEffect, onActivated } from 'vue';
import Output from '@/components/output.vue';
import { computedTime, utilTime, formatScriptStr, formatterShell, exportData, useShellTypeEnum, formatEnv } from '@/utils';
import { deleteItemsById, findAll, getDatabase } from '@/utils/database';
import Terminal from '@/components/Terminal.vue';
import Sftp from '@/components/Sftp.vue';
import { ExcuteListRecoed, ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';
import dayjs from 'dayjs';
import useWin from '@/store/useWin';
import Status from './status.vue';
import { useI18n } from 'vue-i18n';
import { checkLoop } from '@/utils/valid';
import useSettings from '@/store/useSetting';
const isMac = electronAPI.platform === 'darwin';
const isWin32 = electronAPI.platform === 'win32';
const { t } = useI18n();
const settings = useSettings();
const table = ref<InstanceType<typeof Table>>();
const shellTypeEnum = useShellTypeEnum();
const StatusEnum = useStatusEnum();
const clientStore = useClient();

const holdTermRef = ref<InstanceType<typeof Terminal>>();
const terminalsRef = ref();
function reLink() {
    if (!clientStore.config) return;
    clientStore.connect(clientStore.config);
};



function initShell(index?: number) {
    if (typeof index === 'number') {
        terminalsRef.value?.[index]?.initShell();
    } else {
        holdTermRef.value?.initShell();
    }
}

onBeforeUnmount(clientStore.reset);

const formRef = ref<InstanceType<typeof import('element-plus').ElForm>>();
const formDownLoadRef = ref<InstanceType<typeof import('element-plus').ElForm>>();


const formData = reactive({
    cmd: '',
    file: '',
    uploadDir: '/root',
    terminals: [] as { shellNum: number }[],
    selectShell: null as null | ShellListRecoed | undefined,
    selectShellCode: null as any,
    group: '',
    locaDir: '',
    downloadFile: '',
    checkList: [] as ShellListRecoed['baseScripts']
})
electronAPI.appGetPath('downloads').then(dir => {
    formData.locaDir = dir;
})

const rules = computed(() => ({
    file: {
        required: true,
        message: t('pls-select-file'),
    },
    uploadDir: {
        required: true,
        message: t('pls-enter-upload-dir'),
    },
}))

const downLoadRules = computed(() => ({
    locaDir: {
        required: true,
        message: t('pls-enter-save-dir'),
    },
    downloadFile: {
        required: true,
        message: t('pls-enter-download-file'),
    },
}))

const state = reactive({
    showUpload: false,
    showDownload: false,
    uploadLoading: false,
    activeName: 'Execute' as 'Execute' | 'Terminal' | number,
    shellNum: 1,
    shellShow: false,
    scriptName: '',
    shellStr: '',
    /** 全部shell数据 */
    shellList: [] as ShellListRecoed[],
    hostType: 'currentShell' as 'currentHost' | 'all' | 'currentShell' | 'currentGroup' | 'currentConnect',
    currentRecord: null as ExcuteListRecoed | null,
    excuteLogs: [] as ExcuteListRecoed[],
    excuteData: [] as ExcuteListRecoed[],
    groupList: [] as string[],
    selects: [] as ExcuteListRecoed[],
    showAll: false,
})

const outputRef = ref<any>();

async function onSelectFile(type = 'openFile' as 'openFile' | 'openDirectory') {
    const res = await electronAPI.showOpenDialog({
        title: t('pls-select-item'),
        properties: [type],
    })
    if (!res.canceled) {
        formData.file = res.filePaths[0];
    }
}

async function onSelectDir() {
    const res = await electronAPI.showOpenDialog({
        title: t('select-dir'),
        properties: ["openDirectory"]
    })
    if (!res.canceled) {
        formData.locaDir = res.filePaths[0];
    }
}

async function onUpload() {
    const valid = await formRef.value!.validate().catch(() => false);
    if (!valid) return;
    if (!clientStore.status) {
        ElMessage.error(t('connect-lose'));
        return;
    }
    state.showUpload = false;
    await (clientStore.client!.uploadFile(formData.file, formData.uploadDir, { uuid: v4() }));
}

async function onDownLoad() {
    const valid = await formDownLoadRef.value!.validate().catch(() => false);
    if (!valid) return;
    if (!clientStore.status) {
        ElMessage.error(t('connect-lose'));
        return;
    }
    state.uploadLoading = true;
    await (clientStore.client!.downloadFile(formData.locaDir, formData.downloadFile, { uuid: v4() }));
    state.uploadLoading = false;
}

function hasType(selectShell: ShellListRecoed, type: 1 | 2 | 3 | 4) {
    if (!selectShell) return false;
    const { baseScripts } = selectShell;
    return !!baseScripts.find(item => item.type === type);
}
const excuteAbort: Record<string, AbortController> = {};
async function checkAndExcute(checkList?: ShellListRecoed['baseScripts']) {
    if (!formData.selectShell) return;
    const selectShell = formData.selectShell;
    if (!selectShell.baseScripts?.length) {
        ElMessage.error(t('set-config-excute'));
        return
    };

    // 重复执行检查
    for (const item of state.excuteData) {
        if (item.excuteId === selectShell?.uuid && (item.status === 0 || item.status === 3)) {
            const action = await ElMessageBox.confirm(t('already-excute', { scriptName: selectShell.scriptName ?? t('unnamed') }), t('Hint'), {
                type: 'warning',
            }).catch(action => action);
            if (action !== 'confirm') {
                return;
            }
        }
    }
    /** 要执行的脚本含有的类型 */
    let type: number[];
    if (checkList?.length) {
        type = Array.from(new Set(checkList.map(item => item.type)));
    } else {
        type = Array.from(new Set(selectShell.baseScripts.map(item => item.type)));
    }

    if (type.includes(4)) {
        const { pass, shellsFlat } = await checkLoop(selectShell, t, state.shellList);
        if (!pass) return;
        if (type.length !== 4) {
            type = Array.from(shellsFlat.map(shell => shell.baseScripts.map(item => item.type)).flat());
        }
    }

    if (clientStore.status !== 2 && (type.includes(1) || type.includes(3))) {
        ElMessage.error(t('contans-remote-script-unexcute'));
        return;
    }

    // host 检查，不检查子脚本中的host
    if (clientStore.status === 2 && selectShell.host !== clientStore.config?.host && (type.includes(1) || type.includes(3))) {
        const action = await ElMessageBox.confirm(t('excute-unsame-host-script', { scriptName: selectShell.scriptName ?? t('unnamed'), host: selectShell.host }), t('Hint'), {
            type: 'warning',
        }).catch(action => action);
        if (action !== 'confirm') {
            return;
        }
    }

    const uuid = v4();
    const host = (hasType(selectShell, 1) || hasType(selectShell, 3) || hasType(selectShell, 4)) ? (clientStore.config?.host ?? '0.0.0.0') : '0.0.0.0'
    state.excuteData.unshift({
        shellName: selectShell.scriptName ?? t('unnamed'),
        host,
        startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        endTime: '',
        time: '',
        excuteId: selectShell.uuid,
        excuteGroup: selectShell.group,
        excuteType: checkList?.length ? (checkList.length === selectShell.baseScripts.length ? 0 : 1) : 0,
        status: 0,
        logs: '',
        uuid,
        connectId: host === '0.0.0.0' ? null : clientStore.config?.uuid
    });
    table.value?.resetPage();
    const exceteRecord = state.excuteData[0];
    const status = await executeShell(exceteRecord, selectShell, checkList);
    if (status === 1) {
        ElMessage.success(t('tip-excute-end', { shellName: exceteRecord.shellName }));
    }
    excuteResult(status, exceteRecord, true);
}
async function executeShell(exceteRecord: ExcuteListRecoed, selectShell: ShellListRecoed, checkList?: ShellListRecoed['baseScripts']): Promise<0 | 1 | 2 | 3 | 4> {
    const uuid = exceteRecord.uuid;
    const { envVar, baseScripts } = selectShell;
    const logInfo = logInfoFn(exceteRecord);
    excuteAbort[uuid] = new AbortController();
    const { signal } = excuteAbort[uuid];
    function abortRecord(): 4 {
        logInfo(`<p class="cancel">${t('canceled-excute')}</p>`);
        ElMessage.warning(t('canceled-excute-item', { shellName: exceteRecord.shellName }));
        return 4;
    }
    excuteAbort[uuid].signal.addEventListener('abort', () => {
        !exceteRecord.pid && ElMessage.warning(t('set-canceled', { shellName: exceteRecord.shellName }));
        exceteRecord.status = 3;
    })
    if (!baseScripts?.length) {
        logInfo(`<p class="warning">${t('no-script-found')}</p>`);
        return 1;
    }
    expandItem(exceteRecord, selectShell);
    for (let i = 0, l = baseScripts.length; i < l; i++) {
        const item = baseScripts[i];
        if (checkList?.length && !checkList.includes(item)) {
            logInfo(`<p class="cancel">${t('skip-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
            continue;
        };
        if (item.type === 1) {//remote
            logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
            for (const excuteItem of item.baseScripts) {
                const cmd = formatterShell(envVar, excuteItem.value);
                logInfo(`<p class="subtitle">${t('excute-script-cmd')}</p><pre class="cmd">${cmd}</pre>`);
                const code = await clientStore.client!.exec(cmd, (data: string) => {
                    logInfo(data);
                });
                if (signal.aborted) {
                    return abortRecord();
                }
                if (code !== 0) {
                    logInfo(`<p class="error">${t('excute-script-error', { type: shellTypeEnum.value[item.type] })}</p>`);
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    return 2;
                }
            }
        } else if (item.type === 2) {//local
            logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
            for (const excuteItem of item.baseScripts) {
                const cmd = formatterShell(envVar, excuteItem.value);
                const { type, mergeEnv } = excuteItem;
                logInfo(`<p class="subtitle">${t('excute-script-type', { type: isMac ? (type ? (type === 'bat' ? 'sh' : type) : 'native') : (type ? type : 'powershell') })}</p><pre class="cmd">${cmd}</pre>`);
                const env = formatEnv(envVar, excuteItem.env);
                if (env) {
                    logInfo(`<p class="env">(${mergeEnv ? 'merge' : 'only'})${t('env-var-detail', { env: JSON.stringify(env) })}</p>`);
                }
                const { code, data } = await electronAPI.execCmd(cmd, type, { env, mergeEnv });
                logInfo(`<pre class="${code === 0 ? 'success' : 'error'}">${data}</pre>`);
                if (signal.aborted) {
                    return abortRecord();
                }
                if (code !== 0) {
                    logInfo(`<p class="error">${t('excute-script-error', { type: shellTypeEnum.value[item.type] })}</p>`);
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    return 2;

                }
            }
        } else if (item.type === 3) {//upload
            const { remoteDir, localFile, exclude: excludeStr } = item;
            if (!remoteDir || !localFile) {
                ElMessage.warning(t('no-upload-found'));
            } else {
                logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
                const local = formatterShell(envVar, localFile);
                const remote = formatterShell(envVar, remoteDir);
                const exclude = excludeStr ? formatterShell(envVar, excludeStr) : undefined;
                logInfo(`<p class="subtitle">${t('upload-config', { local: `<span class="cmd">${local}</span>`, remote: `<span class="cmd">${remote}</span>` })}${exclude ? ` ${t('ignore-rules')}: <span class="cmd">${exclude}</span>` : ''}</p>`);
                const uploadId = v4();
                const start = dayjs();
                excuteAbort[uuid].signal.addEventListener('abort', () => {
                    clientStore.client!.abortUploadFile(uploadId);
                })
                const result = await (clientStore.client!.uploadFile(local, remote, { quiet: !settings.config.showUploadProcess, name: exceteRecord.shellName, uuid: uploadId, exclude }));
                logInfo(`<p class="success">Done in ${dayjs().diff(start, 'seconds')}s.</p>`);
                if (result === true) {
                    logInfo(`<p class="success">${t('upload-success')}</p>`);

                    if (signal.aborted) {
                        return abortRecord();
                    }
                } else {
                    logInfo(`<p class="error">${t('upload-err', { err: result + '' })}</p>`);
                    if (signal.aborted) {
                        return abortRecord();
                    }
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    return 2;
                }
            }
        } else if (item.type === 5) {//download
            const { remoteDir, localFile, exclude: excludeStr } = item;
            if (!remoteDir || !localFile) {
                ElMessage.warning(t('no-download-found'));
            } else {
                logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
                const local = formatterShell(envVar, localFile);
                const remote = formatterShell(envVar, remoteDir);
                const exclude = excludeStr ? formatterShell(envVar, excludeStr) : undefined;
                logInfo(`<p class="subtitle">${t('download-config', { local: `<span class="cmd">${local}</span>`, remote: `<span class="cmd">${remote}</span>` })}${exclude ? ` ${t('ignore-rules')}: <span class="cmd">${exclude}</span>` : ''}</p>`);
                const uploadId = v4();
                const start = dayjs();
                excuteAbort[uuid].signal.addEventListener('abort', () => {
                    clientStore.client!.abortUploadFile(uploadId);
                })
                const result = await (clientStore.client!.downloadFile(local, remote, { quiet: !settings.config.showUploadProcess, name: exceteRecord.shellName, uuid: uploadId, exclude }));
                logInfo(`<p class="success">Done in ${dayjs().diff(start, 'seconds')}s.</p>`);
                if (result === true) {
                    logInfo(`<p class="success">${t('download-success')}</p>`);

                    if (signal.aborted) {
                        return abortRecord();
                    }
                } else {
                    logInfo(`<p class="error">${t('download-err', { err: result + '' })}</p>`);
                    if (signal.aborted) {
                        return abortRecord();
                    }
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    return 2;
                }
            }
        } else if (item.type === 4) {
            const { combine } = item;
            if (combine?.length) {
                logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
                logInfo(`
                    <p class="subtitle">${t('excute-script-cmd')}</p>
                    <p class="cmd">${combine.map(item => `${t('script-name')}:${item.name || 'unknown'} ${t('Sign')}:${item.value}`).join('<br/>')}</p>
                `);
                const notFound: any[] = []
                const shells = combine.map(item => {
                    const find = state.shellList.find(shell => shell.uuid === item.value);
                    if (!find) {
                        logInfo(`<p class="error">${t('not-found-script')} ${item.name || 'unknow'} (${item.value})</p>`);
                        notFound.push(item);
                    }
                    return find;
                }) as ShellListRecoed[];
                if (notFound.length) {
                    return 2;
                }
                const children = shells.map(selectShell => {
                    const uuid = v4();
                    return {
                        shellName: selectShell.scriptName ?? t('unnamed'),
                        host: (hasType(selectShell, 1) || hasType(selectShell, 3)) ? (clientStore.config?.host ?? '0.0.0.0') : '0.0.0.0',
                        startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        endTime: '',
                        time: '',
                        excuteId: selectShell.uuid,
                        excuteGroup: selectShell.group,
                        excuteType: 0,
                        status: 0,
                        logs: '',
                        uuid,
                        pid: exceteRecord.uuid,
                        connectId: exceteRecord.connectId,
                    } as const;
                })
                if (exceteRecord.children) {
                    exceteRecord.children.push(...children);
                } else {
                    exceteRecord.children = children;
                }
                async function executeItem(exceteRecord: ExcuteListRecoed, shell: ShellListRecoed) {
                    const status = await executeShell(exceteRecord, shell);
                    return await excuteResult(status, exceteRecord);
                }
                const start = dayjs();
                const res = await Promise.all(children.map((exceteRecord, index) => executeItem(exceteRecord, shells[index])));
                logInfo(`<p class="success">Done in ${dayjs().diff(start, 'seconds')}s.</p>`);
                if (signal.aborted) {
                    return abortRecord();
                }
                if (!res.every(item => item === 1)) {
                    logInfo(`<p class="error">${t('excute-script-error', { type: shellTypeEnum.value[item.type] })}</p>`);
                    return 2;
                }
            } else {
                logInfo(`<p class="error">no script found!</p>`);
            }
        } else {
            ElMessage.warning(t('skip-unknown-type', { type: item.type }) + '\n');
        }
    }
    return 1;
}

function cancelExecute(row: ExcuteListRecoed) {
    const { uuid, children } = row;
    if (excuteAbort[uuid]) {
        excuteAbort[uuid].abort();
        //取消子任务
        if (children?.length) {
            for (const item of children) {
                cancelExecute(item);
            }
        }
    } else {
        ElMessage.error(t('abort-404'));
    }
}

function logInfoFn(exceteRecord: ExcuteListRecoed) {
    return function logInfo(data: string) {
        exceteRecord.logs += data;
        if (state.currentRecord && state.currentRecord.uuid === exceteRecord.uuid) {
            outputRef.value?.write(data);
        }
    }
}

function onShowLogs(currentRecord: ExcuteListRecoed) {
    outputRef.value?.clear();
    state.currentRecord = currentRecord;
    nextTick(() => {
        outputRef.value?.write(currentRecord.logs, currentRecord.status === 0);
    })
}

/** 脚本运行完毕后添加数据 */
async function excuteResult(status: ExcuteListRecoed['status'], record: ExcuteListRecoed, save = false) {
    delete excuteAbort[record.uuid];
    record.status = status;
    const startTime = record.startTime;
    record.endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    record.time = computedTime(startTime, record.endTime);
    if (save) {
        const db = await getDatabase();
        const transaction = db.transaction(['excuteList'], 'readwrite');
        const objectStore = transaction.objectStore("excuteList");
        await new Promise<void>((resolve => {
            const request = objectStore.add(JSON.parse(JSON.stringify(record)));
            request.onerror = () => {
                ElMessage.error(t('record-log-error', { shellName: record.shellName }));
                resolve();
            };
            request.onsuccess = () => {
                state.excuteData.splice(state.excuteData.indexOf(record), 1);
                reFresh().then(() => {
                    resolve();
                });
            }
        }))
    }
    return status;
}
/** 展开某一行 */
function expandItem(exceteRecord: ExcuteListRecoed, selectShell: ShellListRecoed) {
    for (const item of selectShell.baseScripts) {
        if (item.type === 4 && item.combine?.length) {
            nextTick(() => {
                table.value?.table.toggleRowExpansion(exceteRecord, true);
            })
            break;
        }
    }
}

function handleTabsEdit(targetName: any, action: 'remove' | 'add') {
    if (action === 'add') {
        formData.terminals.push({
            shellNum: state.shellNum++,
        })
        state.activeName = formData.terminals.length - 1;
    } else {
        formData.terminals.splice(targetName, 1);
        if (typeof state.activeName === 'string') return;
        if (formData.terminals.length === 0) {
            state.activeName = 'Terminal';
            return;
        }
        if (targetName <= state.activeName) {
            if (targetName === 0 && state.activeName === 0) {
                state.activeName = 1;
            } else {
                state.activeName -= 1;
            }
        }
    }
}


function onSelectShell(id: number) {
    formData.selectShell = state.shellList.find(item => item.id === id);
    formData.uploadDir = formData.selectShell?.mainPath ? (formData.selectShell?.envVar?.[formData.selectShell.mainPath] ?? '/root') : '/root';
    formData.checkList = [];
}
function showShell(shell?: ShellListRecoed | null) {
    if (!shell?.baseScripts?.length) {
        ElMessage.error(t('pls-config-script-view'));
        return;
    }
    state.shellShow = true;
    state.shellStr = formatScriptStr(shell.envVar, shell.baseScripts);
    state.scriptName = shell.scriptName;
}

function showTargetShell(row: ExcuteListRecoed) {
    const { excuteId } = row;
    const find = state.shellList?.find(item => item.uuid === excuteId);
    if (!find) {
        ElMessage.error(t('shell-404'));
        return;
    }
    showShell(find);
}

async function openPowershell(command: 'powershell' | 'cmd' | 'code') {
    const pwd = formData.selectShell?.localDir ? (formData.selectShell?.envVar?.[formData.selectShell.localDir] ?? '') : '';
    let open: {
        code: number;
        data: string;
    };

    if (pwd) {
        if (command === 'cmd') {
            open = await electronAPI.openExe(`/d "${pwd}" cmd.exe`);
        } else if (command === 'code') {
            open = await electronAPI.execCmd(`code "${pwd}"`, 'native');
        } else {
            open = await electronAPI.openExe(`/d "${pwd}" powershell.exe`);
        }
    } else {
        open = await electronAPI.openExe(command);
    }
    if (open.code !== 0) {
        ElMessage.error(t('open-term-error', { pwd, err: open.data + '' }));
    }
}

const shellListGroup = computed(() => {
    const groups = [{
        label: t('prefect-script'),
        value: 'prefect-script',
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('only-group'),
        value: 'only-group',
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('only-host'),
        value: 'only-host',
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('fail-script'),
        value: 'fail-script',
        options: [] as { label: string, value: number }[]
    }];
    const host = clientStore.config?.host || '0.0.0.0';
    let shellList = state.shellList;
    if (!state.showAll) {
        shellList = shellList.filter(item => !item.hidden);
    }
    for (const shell of shellList) {
        const shell_host = shell.host || '0.0.0.0';
        if (shell_host === host && shell.group === formData.group) {
            groups[0].options.push({ value: shell.id!, label: shell.scriptName });
        } else if (shell.group === formData.group) {
            groups[1].options.push({ value: shell.id!, label: shell.scriptName });
        } else if (shell_host === host) {
            groups[2].options.push({ value: shell.id!, label: shell.scriptName });
        } else {
            groups[3].options.push({ value: shell.id!, label: shell.scriptName });
        }
    }
    return groups;
})

async function reFresh() {
    getExcuteList();
    await getShellAndGroupList();
    const id = formData.selectShell?.id;
    id && onSelectShell(id);
}

getExcuteList();
async function getExcuteList() {
    state.excuteLogs = await findAll('excuteList');
}

const history = computed(() => {
    const { excuteLogs, excuteData, hostType } = state;
    const history = [...excuteData, ...excuteLogs];
    if (hostType === "currentShell") {
        return history.filter(item => item.excuteId === formData.selectShell?.uuid);
    }
    if (hostType === "currentGroup") {
        return history.filter(item => item.excuteGroup === (formData.group || formData.selectShell?.group));
    }
    if (hostType === 'currentHost') {
        return history.filter(item => item.host === (clientStore.config?.host ?? '0.0.0.0'));
    }
    if (hostType === 'currentConnect') {
        return history.filter(item => (clientStore.config?.host && clientStore.config.host !== '0.0.0.0') ?
            (clientStore.config?.uuid === item.connectId) : (item.host === '0.0.0.0'));
    }
    if (hostType === 'all') {
        return history;
    }
    return [];
})

getShellAndGroupList();
async function getShellAndGroupList() {
    const list = await findAll<ShellListRecoed>('shellList');
    state.shellList = list;
    state.groupList = [...new Set(list.map(item => item.group))].filter(Boolean) as string[];
}

function openDir() {
    electronAPI.openExe(formData.locaDir);
}

onActivated(() => {
    state.currentRecord = null;
})

function onExport() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const text = JSON.stringify({
        excuteList: state.selects.map(({ id, ...rest }) => id ? rest : null).filter(Boolean),
    }, null, 5)
    exportData(text, { defaultPath: 'logs' });
}

async function delItem(id: number | number[]) {
    await deleteItemsById("excuteList", id);
    getExcuteList();
}

async function onDelete() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-record'));
        return;
    }
    const selects = state.selects.map(item => item.id!).filter(Boolean);
    const action = await ElMessageBox.confirm(t('delete-confirm-content', { num: selects.length }), t('delete-confirm'), {
        type: 'warning'
    }).catch(action => action);
    if (action === 'confirm') {
        delItem(selects);
    }
}

function onSelect(rows: ExcuteListRecoed[]) {
    state.selects = rows;
}

function selectable(row: ExcuteListRecoed) {
    return !!row.id;
}

const win = useWin();
watchEffect(() => {
    window.Excute.setTaskNum(state.excuteData.length);
})

function closeWin() {
    electronAPI.setCloseWhenTask0(true);
}

function onCancelColose() {
    electronAPI.setCloseWhenTask0(false);
}
function rowKey(row: ShellListRecoed) {
    return (row.id || row.uuid) + '';
}
</script>
<style lang="less" scoped>
.status {
    display: flex;
    gap: 10px;
    align-items: center;
    line-height: 20px;
    margin-bottom: @gap;
    min-width: 100px;

    .connect-status {
        display: inline-block;
        min-width: 120px;
    }
}

.info {
    line-height: 30px;
}

.excute-tabs {
    height: 100%;

    :deep(.el-tabs__header) {
        >.el-tabs__new-tab {
            margin-right: 10px;
        }
    }

    :deep(.el-tabs__content) {
        padding: 4px 0 0 0;
        width: 100%;
        position: relative;
        overflow: hidden;

        .el-tab-pane {
            height: 100%;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
        }
    }
}

.terminal-pane {
    width: 100%;
}

.sftp-pane {
    width: 100%;
    max-height: 100%;
}

.current-path {
    line-height: 32px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}

.table-title {
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 16px;
    display: flex;
    gap: 8px;
    justify-content: flex-start;
    align-items: center;
}

.refresh-icon {
    margin: 0 5px;
    color: #909399;
    font-size: 18px;

    &:hover {
        color: #F56C6C;
    }
}

.mgL10 {
    margin-left: 10px;
}

.sholl-all {
    display: flex;
    align-items: center;
}

.select-shell-scripts {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    justify-content: center;
    gap: @gap*2;
    margin-bottom: @gap;
}

.select-shell-str {
    overflow-y: auto;
    max-height: 40vh;
    height: fit-content;
}

.script-btns {
    :deep(.el-form-item__content) {
        flex-wrap: nowrap;
    }
}
</style>