<template>
    <BasePage>
        <template #form>
            <div class="status">
                <template v-if="clientStore.config">
                    <span>当前链接的服务器：{{ clientStore.config?.name ?? '未命名' }}</span>
                    <span> 主机：{{ clientStore.config?.host ?? '0.0.0.0' }}</span>
                    <span class="connect-status">
                        连接状态：{{ StatusEnum[clientStore.status] }}
                    </span>
                    <el-button class="mgL10" v-if="clientStore.config && clientStore.status === 0" type="primary"
                        @click="reLink">重新连接</el-button>
                </template>
                <RouterLink :to="{ name: 'main' }" class="mgL10">
                    <el-button type="primary">
                        {{ clientStore.config ? '切换服务器' : '选择服务器' }}
                    </el-button>
                </RouterLink>
                <el-popconfirm v-if="clientStore.status === 2 || clientStore.status === 1"
                    :title="`确定要停止${clientStore.config?.host ?? ''}的链接吗？`" @confirm="clientStore.disConnect">
                    <template #reference>
                        <el-button class="mgL10">断开连接</el-button>
                    </template>
                </el-popconfirm>
                <el-button type="primary" v-if="clientStore.status === 2" class="mgL10"
                    @click="state.showUpload = true">上传文件</el-button>
                <el-button type="primary" v-if="clientStore.status === 2" class="mgL10"
                    @click="state.showDownload = true">下载文件</el-button>
            </div>
        </template>
        <el-form :model="formData" inline>
            <el-tabs v-model="state.activeName" type="border-card" editable @edit="handleTabsEdit"
                @tab-change="onActiveChange">
                <el-tab-pane label="Exce" name="Exce">
                    <el-button v-show="state.currentRecord" @click="state.currentRecord = null"
                        style="margin: 4px 10px;">返回</el-button>
                    <template v-if="state.currentRecord">
                        <span> 执行状态：</span>
                        <Status :status="state.currentRecord.status" />
                    </template>
                    <Output ref="outputRef" v-if="state.currentRecord" />
                    <div style="padding: 24px;" v-show="!state.currentRecord">
                        <el-form-item label="群组选择">
                            <el-select v-model="formData.group" clearable>
                                <el-option v-for="(item, index) of state.groupList" :key="index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="脚本选择" class="script-btns">
                            <el-select-v2 v-model="formData.selectShellCode" @change="onSelectShell" placeholder="请选择"
                                style="width: 220px;" :options="shellListGroup">
                            </el-select-v2>
                            <el-button class="mgL10" @click="reFresh" :icon="Refresh">刷新数据</el-button>
                            <el-button type="primary" @click="excuteShell()" :disabled="!formData.selectShell">
                                执行脚本
                            </el-button>
                            <el-popover title="选择要执行的脚本" :width="550"
                                v-if="formData.selectShell && formData.selectShell.baseScripts && formData.selectShell.baseScripts.length">
                                <template #reference>
                                    <el-button class="mgL10" type="primary">
                                        执行部分脚本
                                    </el-button>
                                </template>
                                <el-checkbox-group v-model="(formData.checkList as any)" class="select-shell-scripts">
                                    <el-checkbox v-for="(item, index) of formData.selectShell.baseScripts" :label="item"
                                        :key="item.key">
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
                                        @click="excuteShell(formData.checkList)">执行所选脚本</el-button>
                                </div>
                            </el-popover>
                            <el-button @click="showShell" class="mgL10" :disabled="!formData.selectShell">查看脚本</el-button>
                            <el-dropdown @command="openPowershell">
                                <el-button class="mgL10">打开本地终端</el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="cmd">打开CMD</el-dropdown-item>
                                        <el-dropdown-item command="powershell">打开Powershell</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                            <el-popconfirm title="确定要在执行完所有任务的时候关闭计算机吗？"
                                v-if="state.excuteData.length && win.close === false" @confirm="closeWin">
                                <template #reference>
                                    <el-button type="danger" class="mgL10">任务执行完毕后关闭计算机</el-button>
                                </template>
                            </el-popconfirm>
                            <el-button class="mgL10" v-if="win.close" @click="onCancelColose">取消任务执行完毕关机设定</el-button>
                        </el-form-item>
                        <div class="table-title">
                            执行记录：
                            <el-radio-group v-model="state.hostType" size="small">
                                <el-radio-button label="currentShell" value="currentShell">当前脚本</el-radio-button>
                                <el-radio-button label="currentGroup" value="currentGroup">当前群组</el-radio-button>
                                <el-radio-button label="currentHost" value="currentHost">当前主机</el-radio-button>
                                <el-radio-button label="all" value="all">所有主机</el-radio-button>
                            </el-radio-group>
                            <span class="mgL10">
                                <el-button @click="onExport" size="small" :icon="Download">导出</el-button>
                                <el-button type="danger" size="small" @click="onDelete" :icon="Delete">删除</el-button>
                            </span>
                        </div>
                        <Table :data="history" @selection-change="onSelect">
                            <el-table-column type="selection" width="55" :selectable="selectable" />
                            <el-table-column prop="shellName" label="脚本名称" show-overflow-tooltip />
                            <el-table-column prop="host" label="目标host" width="120px;" />
                            <el-table-column prop="excuteGroup" label="所在群组" show-overflow-tooltip />
                            <el-table-column prop="excuteType" label="执行脚本" width="120px" show-overflow-tooltip>
                                <template #default="{ row }">
                                    {{ !row.excuteType ? '全部' : row.excuteType === 1 ? '部分' : row.excuteType }}
                                </template>
                            </el-table-column>
                            <el-table-column prop="startTime" label="执行开始时间" width="170px;" />
                            <el-table-column prop="endTime" label="执行结束时间" width="170px;">
                                <template #default="{ row }">
                                    <span v-if="row.endTime">{{ utilTime(row.endTime) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="time" label="执行时长" width="160px" />
                            <el-table-column prop="status" label="执行状态" width="100px">
                                <template #default="{ row }">
                                    <Status :status="row.status" />
                                </template>
                            </el-table-column>
                            <el-table-column label="操作">
                                <template #default="{ row }">
                                    <el-link type="primary" @click="onShowLogs(row)">查看日志</el-link>
                                    <el-popconfirm title="确定要取消执行此任务吗？" v-if="row.status === 0"
                                        @confirm="cancelExte(row.uuid)">
                                        <template #reference>
                                            <el-link type="danger">取消执行</el-link>
                                        </template>
                                    </el-popconfirm>
                                    <el-popconfirm title="确定要删除这条数据吗？" v-if="row.id" @confirm="delItem(row.id)">
                                        <template #reference>
                                            <el-link type="danger">删除</el-link>
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
        <el-dialog v-model="state.shellShow" title="准备执行的脚本详情" width="1000px" draggable>
            <el-input readonly :model-value="state.shellStr" type="textarea" :rows="20" resize="none" />
        </el-dialog>
        <el-dialog v-model="state.showUpload" title="上传文件" width="800px" :close-on-click-modal="false">
            <el-form :model="formData" ref="formRef" :rules="rules" label-width="150px">
                <el-form-item label="选择要上传的文件：" prop="file">
                    <el-button type="primary" @click="onSelectFile('openFile')">选择文件</el-button>
                    <el-button type="primary" @click="onSelectFile('openDirectory')">选择文件夹</el-button>
                </el-form-item>
                <el-form-item prop="file" label="当前文件地址：" required :title="formData.file || '未选择'">
                    <el-input v-model="formData.file" placeholder="选择文件或者输入本地文件或文件夹地址" style="width: 520px;" />
                </el-form-item>
                <el-form-item label="目标地址目录：" prop="uploadDir">
                    <el-input v-model="formData.uploadDir" placeholder="请输入文件上传目录" style="width: 520px;" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button type="primary" @click="onUpload" :loading="state.uploadLoading">上传文件</el-button>
                <el-button @click="state.showUpload = false">取消</el-button>
            </template>
        </el-dialog>
        <el-dialog v-model="state.showDownload" title="下载文件（当前暂不支持下载远程文件夹！）" width="900px" :close-on-click-modal="false">
            <el-form :model="formData" ref="formDownLoadRef" :rules="downLoadRules" label-width="150px">
                <el-form-item label="选择保存的文件夹：" prop="locaDir">
                    <el-button type="primary" @click="onSelectDir">选择文件夹</el-button>
                </el-form-item>
                <el-form-item prop="locaDir" label="保存的文件夹：" required :title="formData.file || '未选择'">
                    <el-input v-model="formData.locaDir" placeholder="选择文件夹或者输入本地文件夹地址" style="width: 520px;" />
                    <el-button class="mgL10" v-if="formData.locaDir" @click="openDir">打开目录</el-button>
                </el-form-item>
                <el-form-item label="目标文件地址：" prop="downloadFile">
                    <el-input v-model="formData.downloadFile" placeholder="请输入目标文件地址" style="width: 520px;" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button type="primary" @click="onDownLoad" :loading="state.uploadLoading">下载文件</el-button>
                <el-button @click="state.showDownload = false">取消</el-button>
            </template>
        </el-dialog>
    </BasePage>
</template>
<script setup lang="ts">
import useClient, { StatusEnum } from '@/store/useClient';
import { ElMessage, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { Download, Delete, Refresh } from '@element-plus/icons-vue';
import { onBeforeUnmount, reactive, ref, nextTick, computed, watchEffect, onActivated } from 'vue';
import Output from '@/components/output.vue';
import { computedTime, utilTime, formatScriptStr, formatterShell, exportData, shellTypeEnum, formatEnv } from '@/utils';
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import Terminal from '@/components/Terminal.vue';
import { ExcuteListRecoed, ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';
import dayjs from 'dayjs';
import useWin from '@/store/useWin';
import Status from './status.vue';

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
const rules = {
    file: {
        required: true,
        message: '请选择文件！',
    },
    uploadDir: {
        required: true,
        message: '请输入上传文件目录！',
    },
}

const downLoadRules = {
    locaDir: {
        required: true,
        message: '请选择存放的文件夹！',
    },
    downloadFile: {
        required: true,
        message: '请输入下载文件地址！',
    },
}

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
        title: '选择上传对象',
        properties: [type],
    })
    if (!res.canceled) {
        formData.file = res.filePaths[0];
    }
}

async function onSelectDir() {
    const res = await electronAPI.showOpenDialog({
        title: '选择文件夹',
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
        ElMessage.error('连接已失效，请重新建立连接！');
        return;
    }
    state.showUpload = false;
    await (clientStore.client!.uploadFile(formData.file, formData.uploadDir));
}

async function onDownLoad() {
    const valid = await formDownLoadRef.value!.validate().catch(() => false);
    if (!valid) return;
    if (!clientStore.status) {
        ElMessage.error('连接已失效，请重新建立连接！');
        return;
    }
    state.uploadLoading = true;
    const result = await (clientStore.client!.downloadFile(formData.locaDir, formData.downloadFile));
    state.uploadLoading = false;
    ElMessage({
        type: result === true ? 'success' : 'error',
        message: result === true ? '文件下载成功！' : (result ? (result + '') : '文件下载失败！'),
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
    if (clientStore.status === 2 && formData.selectShell.host !== clientStore.config?.host && (type.includes(1) || type.includes(3)) && (hasType(1) || hasType(3))) {
        const action = await ElMessageBox.confirm(`脚本："${formData.selectShell.scriptName ?? '未命名'}"关联的主机：${formData.selectShell.host}与当前连接不一致，确定要执行吗？`, '提示', {
            type: 'warning',
        }).catch(action => action);
        if (action !== 'confirm') {
            return;
        }
    }
    for (const item of state.excuteData) {
        if (item.excuteId === formData.selectShell?.uuid && (item.status === 0 || item.status === 3)) {
            const action = await ElMessageBox.confirm(`当前脚本："${formData.selectShell.scriptName ?? '未命名'}"已经在运行，确定要重复运行吗？`, '提示', {
                type: 'warning',
            }).catch(action => action);
            if (action !== 'confirm') {
                return;
            }
        }
    }
    if (!formData.selectShell.baseScripts?.length) {
        ElMessage.error('请设置脚本后执行！');
        return
    };
    if (clientStore.status !== 2 && formData.selectShell.baseScripts.find(item => item.type === 1 || item.type === 3) && (type.includes(1) || type.includes(3))) {
        ElMessage.error('脚本内含有远端脚本，无法执行远端脚本，因为连接未成功建立！');
        return;
    }
    const uuid = v4();
    state.excuteData.unshift({
        shellName: formData.selectShell.scriptName ?? '未命名',
        host: (hasType(1) || hasType(3)) ? (clientStore.config?.host ?? '0.0.0.0') : '0.0.0.0',
        startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        endTime: '',
        time: '',
        excuteId: formData.selectShell.uuid,
        excuteGroup: formData.selectShell.group,
        excuteType: (checkList && checkList.length) ? (checkList.length === formData.selectShell.baseScripts.length ? 0 : 1) : 0,
        status: 0,
        logs: '',
        uuid,
    });
    const exceteRecord = state.excuteData[0];
    const { envVar, baseScripts } = formData.selectShell;
    const logInfo = logInfoFn(exceteRecord);
    excuteAbort[uuid] = new AbortController();
    let abort = false;
    function abortRecord() {
        logInfo(`已取消脚本的执行`);
        ElMessage.warning(`已取消脚本："${exceteRecord.shellName}" 的执行！`);
        excuteResult(4, exceteRecord);
    }
    excuteAbort[uuid].signal.addEventListener('abort', () => {
        ElMessage.warning(`脚本："${exceteRecord.shellName}" 已设置取消脚本指令！`);
        exceteRecord.status = 3;
        abort = true;
    })
    for (let i = 0, l = baseScripts.length; i < l; i++) {
        const item = baseScripts[i];
        if (checkList?.length && !checkList.includes(item)) {
            logInfo(`已跳过${i + 1}、${shellTypeEnum[item.type]}\n`);
            continue;
        };
        if (item.type === 1) {
            logInfo(`开始执行${i + 1}、远端脚本：\n`);
            for (const excuteItem of item.baseScripts) {
                const cmd = formatterShell(envVar, excuteItem.value);
                logInfo(`执行脚本：${cmd}\n`);
                const code = await clientStore.client!.exec(cmd, (data: string) => {
                    logInfo(data);
                });
                if (abort) {
                    abortRecord();
                    return;
                }
                if (code !== 0) {
                    logInfo('远端脚本运行失败');
                    ElMessage.error(`"${exceteRecord.shellName}"中远端脚本运行错误！`);
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else if (item.type === 2) {
            logInfo(`开始执行${i + 1}、${shellTypeEnum[item.type]}：\n`);
            for (const excuteItem of item.baseScripts) {
                const cmd = formatterShell(envVar, excuteItem.value);
                const { type } = excuteItem;
                logInfo(`执行脚本(${type ? type : 'powershell'})：${cmd}\n`);
                const env = formatEnv(envVar, excuteItem.env);
                if (env) {
                    logInfo(`环境变量：${JSON.stringify(env)}\n`);
                }
                const { code, data } = await electronAPI.execCmd(cmd, type, env);
                logInfo(data);
                if (abort) {
                    abortRecord();
                    return;
                }
                if (code !== 0) {
                    logInfo('本地脚本运行失败');
                    ElMessage.error(`"${exceteRecord.shellName}"中本地脚本运行错误！`);
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else if (item.type === 3) {
            const { remoteDir, localFile } = item;
            if (!remoteDir || !localFile) {
                ElMessage.warning('不存在上传设置！');
            } else {
                logInfo(`开始执行${i + 1}、${shellTypeEnum[item.type]}：\n`);
                const local = formatterShell(envVar, localFile);
                const remote = formatterShell(envVar, remoteDir);
                logInfo(`\n上传文件脚本 本地目标：${local} 目标目录：${remote}\n`);
                const result = await (clientStore.client!.uploadFile(local, remote, true));
                if (result === true) {
                    logInfo('文件上传成功\n');
                    if (abort) {
                        abortRecord();
                        return;
                    }
                } else {
                    logInfo('文件上传失败\n');
                    if (abort) {
                        abortRecord();
                        return;
                    }
                    ElMessage.error(`"${exceteRecord.shellName}"中上传脚本运行错误！`);
                    excuteResult(2, exceteRecord);
                    return;
                }
            }
        } else {
            ElMessage.warning(`已无视未知的脚本类型：${item.type}`);
        }
    }
    excuteResult(1, exceteRecord);
    ElMessage.success(`脚本"${exceteRecord.shellName}"执行完毕！`);
}

function cancelExte(uuid: string) {
    if (excuteAbort[uuid]) {
        excuteAbort[uuid].abort();
    } else {
        ElMessage.error('未找到取消句柄！');
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
        ElMessage.error(`${record.shellName}日志记录失败！`);
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
            ElMessage.warning('连接未建立，终端不可用！');
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
        ElMessage.error('请设置脚本后查看！');
        return;
    }
    state.shellShow = true;
    state.shellStr = formatScriptStr(formData.selectShell.envVar, formData.selectShell.baseScripts);
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
        ElMessage.error(`终端打开失败，起始位置为：${pwd}；失败原因：${open.data}  请检查脚本配置！`);
    }
}

const shellListGroup = computed(() => {
    const groups = [{
        label: '完全关联脚本',
        options: [] as { label: string, value: number }[]
    },
    {
        label: '仅关联群组脚本',
        options: [] as { label: string, value: number }[]
    },
    {
        label: '仅关联host脚本',
        options: [] as { label: string, value: number }[]
    },
    {
        label: '非关联脚本',
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
        ElMessage.error('请选择数据！');
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
        const action = await ElMessageBox.confirm('当前存在正在运行的脚本任务，现在关闭窗口数据无法保存，确定要关闭窗口吗？', '提示', {
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