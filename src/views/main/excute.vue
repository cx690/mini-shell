<template>
    <BasePage>
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
                <el-button type="primary" v-if="clientStore.status === 2" class="mgL10" @click="state.showDownload = true"
                    :icon="Download">{{ t('downloadfile') }}</el-button>
            </div>
        </template>
        <el-form :model="formData" inline>
            <el-tabs v-model="state.activeName" type="border-card" editable @edit="handleTabsEdit"
                @tab-change="onActiveChange">
                <el-tab-pane label="Exce" name="Exce">
                    <el-button v-show="state.currentRecord" @click="state.currentRecord = null" style="margin: 4px 10px;">
                        {{ t('Back') }}
                    </el-button>
                    <template v-if="state.currentRecord">
                        <span>{{ t('excute-status') }}：</span>
                        <Status :status="state.currentRecord.status" />
                    </template>
                    <Output ref="outputRef" v-if="state.currentRecord" />
                    <div style="padding: 24px;" v-show="!state.currentRecord">
                        <el-form-item :label="t('group-select')">
                            <el-select v-model="formData.group" :placeholder="t('pls-select')" clearable>
                                <el-option v-for="(item, index) of state.groupList" :key="index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                        <el-form-item :label="t('script-select')" class="script-btns">
                            <el-select-v2 v-model="formData.selectShellCode" @change="onSelectShell"
                                :placeholder="t('pls-select')" style="width: 220px;" :options="shellListGroup">
                            </el-select-v2>
                            <el-button class="mgL10" @click="reFresh" :icon="Refresh">{{ t('refresh-data') }}</el-button>
                            <el-button type="primary" @click="excuteShell()" :disabled="!formData.selectShell"
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
                                        :key="item.key">
                                        <el-tooltip placement="top">
                                            <span>{{ (index + 1) + '、' + shellTypeEnum[item.type] }}</span>
                                            <template #content>
                                                <div class="select-shell-str">
                                                    <pre>{{ formatScriptStr(formData.selectShell.envVar, [item], t) }}</pre>
                                                </div>
                                            </template>
                                        </el-tooltip>
                                    </el-checkbox>
                                </el-checkbox-group>
                                <div>
                                    <el-button type="primary" :disabled="!formData.checkList.length"
                                        @click="excuteShell(formData.checkList)" :icon="CaretRight">
                                        {{ t('excute-select') }}
                                    </el-button>
                                </div>
                            </el-popover>
                            <el-button @click="showShell" class="mgL10" :disabled="!formData.selectShell" :icon="View">{{
                                t('view-script') }}</el-button>
                            <el-dropdown @command="openPowershell">
                                <el-button class="mgL10">{{ t('open-local-term') }}</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="cmd">{{ t('Open ') }}CMD</el-dropdown-item>
                                        <el-dropdown-item command="powershell">{{ t('Open ') }}Powershell</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                            <el-popconfirm :title="t('confirm-close-windows')"
                                v-if="state.excuteData.length && win.close === false" @confirm="closeWin">
                                <template #reference>
                                    <el-button type="danger" class="mgL10" :icon="SwitchButton">
                                        {{ t('close-windows-btn') }}
                                    </el-button>
                                </template>
                            </el-popconfirm>
                            <el-button class="mgL10" v-if="win.close" @click="onCancelColose" :icon="Remove">{{
                                t('cancel-close-windows-btn') }}</el-button>
                        </el-form-item>
                        <div class="table-title">
                            {{ t('excute-logs') }}：
                            <el-radio-group v-model="state.hostType" size="small">
                                <el-radio-button label="currentShell" value="currentShell">
                                    {{ t('current-shell') }}
                                </el-radio-button>
                                <el-radio-button label="currentGroup" value="currentGroup">{{ t('current-group')
                                }}</el-radio-button>
                                <el-radio-button label="currentHost" value="currentHost">{{ t('current-host')
                                }}</el-radio-button>
                                <el-radio-button label="all" value="all">{{ t('all-logs') }}</el-radio-button>
                            </el-radio-group>
                            <span class="mgL10">
                                <el-button @click="onExport" size="small" :icon="Download">{{ t('Export') }}</el-button>
                                <el-button type="danger" size="small" @click="onDelete" :icon="Delete">{{ t('Delete')
                                }}</el-button>
                            </span>
                        </div>
                        <Table :data="history" @selection-change="onSelect">
                            <el-table-column type="selection" width="55" :selectable="selectable" />
                            <el-table-column prop="shellName" :label="t('script-name')" show-overflow-tooltip />
                            <el-table-column prop="host" :label="t('de-host')" width="120px;" />
                            <el-table-column prop="excuteGroup" :label="t('group-by')" show-overflow-tooltip />
                            <el-table-column prop="excuteType" :label="t('excuted-script')" width="140px"
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
                                    <el-link type="primary" @click="onShowLogs(row)">{{ t('View') }}</el-link>
                                    <el-popconfirm :title="t('confirm-cancel-task')" v-if="row.status === 0"
                                        @confirm="cancelExte(row.uuid)">
                                        <template #reference>
                                            <el-link type="danger">{{ t('cancel-excute') }}</el-link>
                                        </template>
                                    </el-popconfirm>
                                    <el-popconfirm :title="t('confirm-delete-item')" v-if="row.id"
                                        @confirm="delItem(row.id)">
                                        <template #reference>
                                            <el-link type="danger">{{ t('Delete') }}</el-link>
                                        </template>
                                    </el-popconfirm>
                                </template>
                            </el-table-column>
                        </Table>
                    </div>
                </el-tab-pane>
                <el-tab-pane key="handle-terminal" name="Terminal" class="terminal-pane">
                    <template #label>
                        <span>Terminal</span>
                        <el-icon class="refresh-icon" @click="initShell()"
                            v-if="createdTerm && state.activeName === 'Terminal'">
                            <Refresh />
                        </el-icon>
                    </template>
                    <Terminal v-if="createdTerm" ref="holdTermRef" />
                </el-tab-pane>
                <el-tab-pane v-for="(item, index) of formData.terminals" :key="index" :name="index" class="terminal-pane">
                    <template #label>
                        <span>{{ item.shellName }}</span>
                        <el-icon class="refresh-icon" @click="initShell(index)" v-if="state.activeName === index">
                            <Refresh />
                        </el-icon>
                    </template>
                    <Terminal ref="terminalsRef" init />
                </el-tab-pane>
            </el-tabs>
        </el-form>
        <el-dialog v-model="state.shellShow" :title="t('format-script-detail')" width="1000px" draggable>
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
                <el-button type="primary" @click="onUpload" :loading="state.uploadLoading">{{ t('uploadfile') }}</el-button>
                <el-button @click="state.showUpload = false">{{ t('Cancel') }}</el-button>
            </template>
        </el-dialog>
        <el-dialog v-model="state.showDownload" :title="t('downloadfile-unsport')" width="900px"
            :close-on-click-modal="false">
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
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import Terminal from '@/components/Terminal.vue';
import { ExcuteListRecoed, ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';
import dayjs from 'dayjs';
import useWin from '@/store/useWin';
import Status from './status.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const shellTypeEnum = useShellTypeEnum();
const StatusEnum = useStatusEnum();
const clientStore = useClient();

const holdTermRef = ref();
const createdTerm = ref(false);
const terminalsRef = ref();
function reLink() {
    if (!clientStore.config) return;
    clientStore.connect(clientStore.config);
};

watchEffect(() => {
    if (clientStore.status === 2) {
        nextTick(() => {
            holdTermRef.value?.initShell();//holdTermRef不可被添加为依赖
            if (state.activeName === 'Terminal') {
                holdTermRef.value?.focus();
            }
        })

    }
}, {
    flush: 'post'
})

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

type ShellItem = {
    shellName: string,
}

const formData = reactive({
    cmd: '',
    file: '',
    uploadDir: '/root',
    terminals: [] as ShellItem[],
    selectShell: null as null | ShellListRecoed | undefined,
    selectShellCode: null as any,
    group: '',
    locaDir: '',
    downloadFile: '',
    checkList: [] as ShellListRecoed['baseScripts']
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
    activeName: 'Exce' as 'Exce' | 'Terminal' | number,
    shellNum: 1,
    shellShow: false,
    shellStr: '',
    shellList: [] as ShellListRecoed[],
    hostType: 'currentShell' as 'currentHost' | 'all' | 'currentShell' | 'currentGroup',
    currentRecord: null as ExcuteListRecoed | null,
    excuteLogs: [] as ExcuteListRecoed[],
    excuteData: [] as ExcuteListRecoed[],
    groupList: [] as string[],
    selects: [] as ExcuteListRecoed[]
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
    console.time('上传')
    await (clientStore.client!.uploadFile(formData.file, formData.uploadDir));
    console.timeEnd('上传')
}

async function onDownLoad() {
    const valid = await formDownLoadRef.value!.validate().catch(() => false);
    if (!valid) return;
    if (!clientStore.status) {
        ElMessage.error(t('connect-lose'));
        return;
    }
    state.uploadLoading = true;
    const result = await (clientStore.client!.downloadFile(formData.locaDir, formData.downloadFile));
    state.uploadLoading = false;
    ElMessage({
        type: result === true ? 'success' : 'error',
        message: result === true ? t('downloadfile-success') : (result ? (result + '') : t('downloadfile-error')),
    })
}

function hasType(type: 1 | 2 | 3) {
    if (!formData.selectShell) return false;
    const { baseScripts } = formData.selectShell;
    return !!baseScripts.find(item => item.type === type);
}
const excuteAbort: Record<string, AbortController> = {};
async function excuteShell(checkList?: ShellListRecoed['baseScripts']) {
    let type = [1, 2, 3];
    if (checkList?.length) {
        type = checkList.map(item => item.type);
    }
    if (!formData.selectShell) return;
    const selectShell = formData.selectShell;
    if (clientStore.status === 2 && selectShell.host !== clientStore.config?.host && (type.includes(1) || type.includes(3)) && (hasType(1) || hasType(3))) {
        const action = await ElMessageBox.confirm(t('excute-unsame-host-script', { scriptName: selectShell.scriptName ?? t('unnamed'), host: selectShell.host }), t('Hint'), {
            type: 'warning',
        }).catch(action => action);
        if (action !== 'confirm') {
            return;
        }
    }
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
    if (!selectShell.baseScripts?.length) {
        ElMessage.error(t('set-config-excute'));
        return
    };
    if (clientStore.status !== 2 && selectShell.baseScripts.find(item => item.type === 1 || item.type === 3) && (type.includes(1) || type.includes(3))) {
        ElMessage.error(t('contans-remote-script-unexcute'));
        return;
    }
    const uuid = v4();
    state.excuteData.unshift({
        shellName: selectShell.scriptName ?? t('unnamed'),
        host: (hasType(1) || hasType(3)) ? (clientStore.config?.host ?? '0.0.0.0') : '0.0.0.0',
        startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        endTime: '',
        time: '',
        excuteId: selectShell.uuid,
        excuteGroup: selectShell.group,
        excuteType: (checkList && checkList.length) ? (checkList.length === selectShell.baseScripts.length ? 0 : 1) : 0,
        status: 0,
        logs: '',
        uuid,
    });
    const exceteRecord = state.excuteData[0];
    const { envVar, baseScripts } = selectShell;
    const logInfo = logInfoFn(exceteRecord);
    excuteAbort[uuid] = new AbortController();
    let abort = false;
    function abortRecord() {
        logInfo(`<p class="cancel">${t('canceled-excute')}</p>`);
        ElMessage.warning(t('canceled-excute-item', { shellName: exceteRecord.shellName }));
        excuteResult(4, exceteRecord);
    }
    excuteAbort[uuid].signal.addEventListener('abort', () => {
        ElMessage.warning(t('set-canceled', { shellName: exceteRecord.shellName }));
        exceteRecord.status = 3;
        abort = true;
    })
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
                if (abort) {
                    abortRecord();
                    return;
                }
                if (code !== 0) {
                    logInfo(`<p class="error">${t('excute-script-error', { type: shellTypeEnum.value[item.type] })}</p>`);
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else if (item.type === 2) {//local
            logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
            for (const excuteItem of item.baseScripts) {
                const cmd = formatterShell(envVar, excuteItem.value);
                const { type } = excuteItem;
                logInfo(`<p class="subtitle">${t('excute-script-type', { type: type ? type : 'powershell' })}</p><pre class="cmd">${cmd}</pre>`);
                const env = formatEnv(envVar, excuteItem.env);
                if (env) {
                    logInfo(`<p class="env">${t('env-var-detail', { env: JSON.stringify(env) })}</p>`);
                }
                const { code, data } = await electronAPI.execCmd(cmd, type, env);
                logInfo(`<pre class="${code === 0 ? 'success' : 'error'}">${data}</pre>`);
                if (abort) {
                    abortRecord();
                    return;
                }
                if (code !== 0) {
                    logInfo(`<p class="error">$t('excute-script-error', { type: shellTypeEnum.value[item.type] })}</p>`);
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else if (item.type === 3) {//upload
            const { remoteDir, localFile } = item;
            if (!remoteDir || !localFile) {
                ElMessage.warning(t('no-upload-found'));
            } else {
                logInfo(`<p class="title">${t('start-excute-script', { num: i + 1, type: shellTypeEnum.value[item.type] })}</p>`);
                const local = formatterShell(envVar, localFile);
                const remote = formatterShell(envVar, remoteDir);
                logInfo(`<p class="subtitle">${t('upload-config', { local: `<span class="cmd">${local}</span>`, remote: `<span class="cmd">${remote}</span>` })}</p>`);
                const result = await (clientStore.client!.uploadFile(local, remote, true));
                if (result === true) {
                    logInfo(`<p class="success">${t('upload-success')}</p>`);
                    if (abort) {
                        abortRecord();
                        return;
                    }
                } else {
                    logInfo(`<p class="error">${t('upload-err', { err: result + '' })}</p>`);
                    if (abort) {
                        abortRecord();
                        return;
                    }
                    ElMessage.error(t('tip-excute-script-error', { shellName: exceteRecord.shellName }));
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else {
            ElMessage.warning(t('skip-unknown-type', { type: item.type }) + '\n');
        }
    }
    excuteResult(1, exceteRecord);
    ElMessage.success(t('tip-excute-end', { shellName: exceteRecord.shellName }));
}

function cancelExte(uuid: string) {
    if (excuteAbort[uuid]) {
        excuteAbort[uuid].abort();
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
async function excuteResult(status: ExcuteListRecoed['status'], record: ExcuteListRecoed) {
    delete excuteAbort[record.uuid];
    record.status = status;
    const db = await getDatabase();
    const transaction = db.transaction(['excuteList'], 'readwrite');
    const objectStore = transaction.objectStore("excuteList");
    const startTime = record.startTime;
    record.endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    record.time = computedTime(startTime, record.endTime);
    const request = objectStore.add(JSON.parse(JSON.stringify(record)));
    request.onerror = () => {
        ElMessage.error(t('record-log-error', { shellName: record.shellName }));
    };
    request.onsuccess = () => {
        state.excuteData.splice(state.excuteData.indexOf(record), 1);
        reFresh();
    }
}

function handleTabsEdit(targetName: any, action: 'remove' | 'add') {
    if (action === 'add') {
        formData.terminals.push({
            shellName: 'New Terminal' + state.shellNum++,
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

function onActiveChange(activeName: any) {
    if (activeName === 'Terminal') {
        if (clientStore.status !== 2) {
            ElMessage.warning(t('unuse-term'));
        } else {
            if (createdTerm.value === false) {
                nextTick(() => {
                    holdTermRef.value?.initShell();
                })
            }
        }
        createdTerm.value = true;
    }
}

function onSelectShell(id: number) {
    formData.selectShell = state.shellList.find(item => item.id === id);
    formData.uploadDir = formData.selectShell?.mainPath ? (formData.selectShell?.envVar[formData.selectShell.mainPath] ?? '/root') : '/root';
    formData.checkList = [];
}
function showShell() {
    if (!formData.selectShell?.baseScripts?.length) {
        ElMessage.error(t('pls-config-script-view'));
        return;
    }
    state.shellShow = true;
    state.shellStr = formatScriptStr(formData.selectShell.envVar, formData.selectShell.baseScripts, t);
}

async function openPowershell(command: 'powershell' | 'cmd') {
    const pwd = formData.selectShell?.localDir ? (formData.selectShell?.envVar[formData.selectShell.localDir] ?? '') : '';
    let open: {
        code: number;
        data: string;
    };

    if (pwd) {
        if (command === 'cmd') {
            open = await electronAPI.openExe(`/d "${pwd}" cmd.exe`);
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
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('only-group'),
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('only-host'),
        options: [] as { label: string, value: number }[]
    },
    {
        label: t('fail-script'),
        options: [] as { label: string, value: number }[]
    }];
    const host = clientStore.config?.host || '0.0.0.0';
    for (const shell of state.shellList) {
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
        ElMessage.error(t('pls-select-item'));
        return;
    }
    const text = JSON.stringify({
        excuteList: state.selects.map(({ id, ...rest }) => rest),
    }, null, 5)
    exportData(text, { defaultPath: 'logs' });
}

async function delItem(id: number | number[]) {
    const db = await getDatabase();
    await deleteItems(db.transaction(["excuteList"], 'readwrite').objectStore("excuteList"), id);
    getExcuteList();
}

async function onDelete() {
    if (!state.selects.length) {
        ElMessage.error(t('pls-select-item'));
        return;
    }
    const action = await ElMessageBox.confirm(t('delete-confirm-content', { num: state.selects.length }), t('delete-confirm'), {
        type: 'warning'
    }).catch(action => action);
    if (action === 'confirm') {
        delItem(state.selects.map(item => item.id!));
    }
}

function onSelect(rows: ExcuteListRecoed[]) {
    state.selects = rows;
}

function selectable(row: ExcuteListRecoed) {
    return !!row.id;
}

if (process.env.NODE_ENV !== 'development') {
    let confirmd = false;
    let confirming = false;
    window.addEventListener('beforeunload', async (e) => {
        if (confirmd || !state.excuteData.length) return;
        e.preventDefault();
        if (confirming) return;
        confirming = true;
        const action = await ElMessageBox.confirm(t('has-task-close-window'), t('Hint'), {
            type: 'warning',
        }).catch(action => action);
        confirming = false;
        if (action === 'confirm') {
            confirmd = true;
            window.close();
        }
    });
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
        width: 120px;
    }
}

.info {
    line-height: 30px;
}

.el-tabs {
    :deep(.el-tabs__header) {
        >.el-tabs__new-tab {
            margin-right: 10px;
        }

        >.el-tabs__nav-wrap {

            .el-tabs__item:nth-child(1)>.is-icon-close,
            .el-tabs__item:nth-child(2)>.is-icon-close {
                display: none;
            }
        }
    }

    :deep(.el-tabs__content) {
        padding: 4px 0 0 0;
        width: 100%;
    }
}

.terminal-pane {
    height: 740px;
    width: 100%;
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