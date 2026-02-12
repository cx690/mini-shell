<template>
    <div class="sftp-page">
        <div class="sftp-panels">
            <!-- 左侧：本机 -->
            <div class="sftp-panel local">
                <div class="panel-header">
                    <span class="panel-title">{{ t('local-files') }}</span>
                    <el-button size="small" :icon="FolderOpened" @click="pickLocalDir">{{ t('select-dir') }}</el-button>
                    <el-button size="small" :icon="Postcard" @click="enterDesktop">{{ t('enter-desktop') }}</el-button>
                    <el-button v-if="isWin" size="small" :icon="Monitor" @click="enterThisPc">
                        {{ t('this-pc') }}
                    </el-button>
                </div>
                <div class="panel-path">
                    <el-input v-model="state.localPathShow" size="small" @keypress.enter="refreshLocal">
                        <template #prepend>{{ t('path') }}</template>
                    </el-input>
                    <el-button size="small" @click="refreshLocal" :loading="state.localLoading">
                        {{ t('refresh') }}
                    </el-button>
                </div>
                <div class="panel-toolbar">
                    <el-button size="small" :icon="FolderAdd" :disabled="state.isDriveRoot" @click="addDir('local')">
                        {{ t('new-folder') }}
                    </el-button>
                    <el-button size="small" :icon="Delete"
                        :disabled="!state.localSelected || state.localSelected.name === '..' || state.isDriveRoot"
                        @click="deleteLocal">
                        {{ t('delete') }}
                    </el-button>
                    <el-button size="small" :icon="Edit"
                        :disabled="!state.localSelected || state.localSelected.name === '..' || state.isDriveRoot"
                        @click="renameLocal">
                        {{ t('rename') }}
                    </el-button>
                    <el-button size="small" :icon="Upload"
                        :disabled="!state.localSelected || !remoteConnected || state.isDriveRoot" type="primary"
                        @click="uploadToRemote">
                        {{ t('upload') }}
                    </el-button>
                </div>
                <div class="panel-list" @contextmenu.prevent="onPanelContextMenu($event, 'local')">
                    <div v-if="!state.localPath && !state.localList.length" class="list-hint">
                        {{ t('select-dir-hint') }}
                    </div>
                    <el-table v-loading="state.localLoading" v-else :data="localTableData" :row-key="rowKey"
                        highlight-current-row :current-row-key="localCurrentRowKey"
                        @current-change="state.localSelected = $event" @row-dblclick="onLocalRowDblclick"
                        class="file-table" height="100%" size="small" ref="localTableRef">
                        <el-table-column :label="t('Name')" min-width="0">
                            <template #default="{ row }">
                                <span class="table-name">
                                    <el-icon v-if="row.isParent">
                                        <Back />
                                    </el-icon>
                                    <el-icon v-else-if="row.isDirectory">
                                        <Folder />
                                    </el-icon>
                                    <el-icon v-else>
                                        <Document />
                                    </el-icon>
                                    <span class="name-text">
                                        <template v-if="!row.isParent && row.isEdit">
                                            <el-input v-model="row.renameValue" size="small" class="inline-rename-input"
                                                @keypress.enter="confirmRename('local', row)"
                                                @blur="confirmRename('local', row)" />
                                        </template>
                                        <span v-else>{{ row.name }}</span>
                                    </span>
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="size" :label="t('size')" width="100" align="right">
                            <template #default="{ row }">
                                <span v-if="!row.isDirectory && !row.isParent && row.size != null">{{
                                    formatSize(row.size) }}</span>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>

            <!-- 右侧：远程 -->
            <div class="sftp-panel remote">
                <div class="panel-header">
                    <span class="panel-title">{{ t('remote-files') }}</span>
                    <el-tag v-if="remoteConnected" type="success" size="small">{{ clientStore.config?.name ??
                        t('connected') }}
                    </el-tag>
                    <el-tag v-else type="info" size="small">{{ t('not-connected') }}</el-tag>
                </div>
                <div class="panel-path">
                    <el-input v-model="state.remotePathShow" size="small" @keypress.enter="applyRemotePathAndLoad">
                        <template #prepend>{{ t('remote-path') }}</template>
                    </el-input>
                    <el-button size="small" @click="applyRemotePathAndLoad" :loading="state.remoteLoading">
                        {{ t('refresh') }}
                    </el-button>
                </div>
                <div class="panel-toolbar">
                    <el-button size="small" :icon="FolderAdd" :disabled="!remoteConnected" @click="addDir('remote')">
                        {{ t('new-folder') }}
                    </el-button>
                    <el-button size="small" :icon="Delete" :disabled="!state.remoteSelected || !remoteConnected"
                        @click="deleteRemote">
                        {{ t('delete') }}
                    </el-button>
                    <el-button size="small" :icon="Edit"
                        :disabled="!state.remoteSelected || state.remoteSelected.name === '..' || !remoteConnected"
                        @click="renameRemote">
                        {{ t('rename') }}
                    </el-button>
                    <el-button size="small" :icon="Download"
                        :disabled="!state.remoteSelected || !remoteConnected || state.isDriveRoot" type="primary"
                        @click="downloadToLocal">
                        {{ t('download') }}
                    </el-button>
                </div>
                <div class="panel-list" @contextmenu.prevent="onPanelContextMenu($event, 'remote')">
                    <div v-if="!remoteConnected" class="list-hint">{{ t('connect-first-hint') }}</div>
                    <el-table v-loading="state.remoteLoading" v-else :data="remoteTableData" :row-key="rowKey"
                        highlight-current-row :current-row-key="remoteCurrentRowKey"
                        @current-change="state.remoteSelected = $event" @row-dblclick="onRemoteRowDblclick"
                        class="file-table" height="100%" size="small" ref="remoteTableRef">
                        <el-table-column :label="t('Name')" min-width="0">
                            <template #default="{ row }">
                                <span class="table-name">
                                    <el-icon v-if="row.isParent">
                                        <Back />
                                    </el-icon>
                                    <el-icon v-else-if="row.isDirectory">
                                        <Folder />
                                    </el-icon>
                                    <el-icon v-else>
                                        <Document />
                                    </el-icon>
                                    <span class="name-text">
                                        <template v-if="!row.isParent && row.isEdit">
                                            <el-input v-model="row.renameValue" size="small" class="inline-rename-input"
                                                @keypress.enter="confirmRename('remote', row)"
                                                @blur="confirmRename('remote', row)" />
                                        </template>
                                        <span v-else>{{ row.name }}</span>
                                    </span>
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="size" :label="t('size')" width="100" align="right">
                            <template #default="{ row }">
                                <span v-if="!row.isDirectory && !row.isParent && row.size != null">{{
                                    formatSize(row.size) }}</span>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>
        </div>
        <!-- 右键菜单：el-dropdown 虚拟触发 -->
        <el-dropdown ref="contextDropdownRef" :virtual-ref="triggerRef" virtual-triggering trigger="contextmenu"
            placement="bottom-start" :show-arrow="false"
            :popper-options="{ modifiers: [{ name: 'offset', options: { offset: [0, 0] } }] }"
            @command="handleContextCommand">
            <template #dropdown>
                <el-dropdown-menu>
                    <template v-if="state.contextMenuType === 'local-row'">
                        <el-dropdown-item :icon="Edit" command="rename" :disabled="state.isDriveRoot">
                            {{ t('rename') }}
                        </el-dropdown-item>
                        <el-dropdown-item :icon="Delete" command="delete" :disabled="state.isDriveRoot">
                            {{ t('delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="state.contextMenuType === 'local-row'"
                            :disabled="state.isDriveRoot || !remoteConnected" :icon="Upload" command="upload">
                            {{ t('upload') }}
                        </el-dropdown-item>
                    </template>
                    <template v-if="state.contextMenuType === 'remote-row'">
                        <el-dropdown-item :icon="Edit" command="rename">
                            {{ t('rename') }}
                        </el-dropdown-item>
                        <el-dropdown-item :icon="Delete" command="delete">
                            {{ t('delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="state.contextMenuType === 'remote-row'" :icon="Download"
                            command="download">
                            {{ t('download') }}
                        </el-dropdown-item>
                    </template>
                    <template
                        v-if="state.contextMenuType === 'local-panel' || state.contextMenuType === 'remote-panel'">
                        <el-dropdown-item command="refresh" :icon="Refresh">{{ t('refresh') }}</el-dropdown-item>
                        <el-dropdown-item command="newFolder" :icon="FolderAdd">{{ t('new-folder') }}</el-dropdown-item>
                    </template>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox, ElTable } from 'element-plus';
import { FolderOpened, FolderAdd, Delete, Edit, Upload, Download, Back, Folder, Document, Monitor, Postcard, Refresh } from '@element-plus/icons-vue';
import useClient from '@/store/useClient';
import { useI18n } from 'vue-i18n';
import { formatSize } from '@/utils';
import type { SFTPType } from 'electron/preload/ssh2';
import { v4 } from 'uuid';

const { t } = useI18n();
const clientStore = useClient();

/** 组件内唯一的 SFTP 实例，连接建立时创建、断开或卸载时销毁 */
const sftpInstance = ref<SFTPType | null>(null);

async function initSftp() {
    if (!clientStore.client || clientStore.status !== 2) return;
    try {
        state.remotePath = '/';
        state.remotePathShow = '/';
        state.remoteList = [];
        const sftp = await clientStore.client.sftp();
        sftpInstance.value = sftp;
    } catch (err) {
        console.error(err);
        sftpInstance.value = null;
    }
}

async function clearSftp() {
    if (sftpInstance.value) {
        try {
            await sftpInstance.value.end();
        } catch (e) {
            console.error(e);
        }
        sftpInstance.value = null;
    }
}

/** 确保有可用的 sftp 实例再执行远程操作 */
async function ensureSftp(): Promise<SFTPType | null> {
    if (sftpInstance.value) return sftpInstance.value;
    if (clientStore.status !== 2 || !clientStore.client) return null;
    await initSftp();
    return sftpInstance.value;
}

type LocalFileItem = { name: string; isDirectory: boolean; size?: number, isEdit?: boolean, renameValue?: string, isNew?: boolean };
type RemoteFileItem = { name: string; isDirectory: boolean; size?: number; mtime?: number, isEdit?: boolean, renameValue?: string, isNew?: boolean };

const state = reactive({
    localPathShow: '',
    localPath: '',
    localList: [] as LocalFileItem[],
    localLoading: false,
    localSelected: null as LocalFileItem | null,
    isDriveRoot: false,

    remotePathShow: '/',
    remotePath: '/',
    remoteList: [] as RemoteFileItem[],
    remoteLoading: false,
    remoteSelected: null as RemoteFileItem | null,

    showNewLocalDir: false,
    showNewRemoteDir: false,

    contextMenuType: '' as '' | 'local-row' | 'remote-row' | 'local-panel' | 'remote-panel',
});

const remoteConnected = computed(() => clientStore.status === 2);
const isWin = computed(() => electronAPI.platform === 'win32');

const localPathParts = computed(() => {
    const p = state.localPath.replace(/\\/g, '/').replace(/\/+$/, '');
    return p ? p.split('/').filter(Boolean) : [];
});

type LocalRow = LocalFileItem & { isParent?: boolean };
type RemoteRow = RemoteFileItem & { isParent?: boolean };

/** Windows 下是否为盘符根目录（如 C:\） */
const isLocalDriveRoot = computed(() => {
    if (electronAPI.platform !== 'win32') return false;
    return localPathParts.value.length === 1;
});

const localTableData = computed<LocalRow[]>(() => {
    const rows: LocalRow[] = [];
    if (electronAPI.platform === 'win32' && isLocalDriveRoot.value) {
        rows.push({ name: '..', isDirectory: true, isParent: true });
    } else if (localPathParts.value.length > 0) {
        rows.push({ name: '..', isDirectory: true, isParent: true });
    }
    if (state.showNewLocalDir) {
        rows.push({ name: '', isDirectory: true, isEdit: true, renameValue: '', isNew: true });
    }
    state.localList.forEach((item) => rows.push({ ...item, isParent: false }));
    return rows;
});

const remoteTableData = computed<RemoteRow[]>(() => {
    const rows: RemoteRow[] = [];
    if (state.remotePath !== '/' && state.remotePath !== '') {
        rows.push({ name: '..', isDirectory: true, isParent: true });
    }
    if (state.showNewRemoteDir) {
        rows.push({ name: '', isDirectory: true, isEdit: true, renameValue: '', isNew: true });
    }
    state.remoteList.forEach((item) => rows.push({ ...item, isParent: false }));
    return rows;
});

const parentKey = '$$__parent__$$';
function rowKey(row: LocalRow) {
    return row.isParent ? parentKey : row.name;
}

const localCurrentRowKey = computed(() => {
    const sel = state.localSelected;
    if (!sel) return undefined;
    return (sel as LocalRow).isParent ? parentKey : sel.name;
});
const remoteCurrentRowKey = computed(() => {
    const sel = state.remoteSelected;
    if (!sel) return undefined;
    return (sel as RemoteRow).isParent ? parentKey : sel.name;
});

/** 右键菜单：虚拟触发位置（el-dropdown 虚拟触发用） */
const contextMenuPosition = ref({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
const triggerRef = ref({
    getBoundingClientRect: () => contextMenuPosition.value,
});
const contextDropdownRef = ref<{ handleOpen: () => void } | null>(null);

function onLocalRowDblclick(row: LocalRow) {
    if (row.isParent) localGoUp();
    else localEnter(row);
}
function onRemoteRowDblclick(row: RemoteRow) {
    if (row.isParent) remoteGoUp();
    else remoteEnter(row);
}

function onPanelContextMenu(e: MouseEvent, side: 'local' | 'remote') {
    const tr = (e.target as HTMLElement).closest('tr.el-table__row');
    if (tr) {
        const tableRef = side === 'local' ? localTableRef.value : remoteTableRef.value;
        const tbody = tableRef?.$el?.querySelector('.el-table__body-wrapper tbody');
        if (tbody) {
            const rows = Array.from(tbody.querySelectorAll('tr.el-table__row'));
            const index = rows.indexOf(tr as Element);
            if (index >= 0) {
                const tableData = side === 'local' ? localTableData.value : remoteTableData.value;
                const row = tableData[index];
                if (row && !(row as LocalRow).isParent && !(row as LocalRow).isNew) {
                    if (side === 'local') state.localSelected = row as LocalFileItem;
                    else state.remoteSelected = row as RemoteFileItem;
                    state.contextMenuType = (side + '-row') as 'local-row' | 'remote-row';
                    contextMenuPosition.value = DOMRect.fromRect({ x: e.clientX, y: e.clientY });
                    nextTick(() => contextDropdownRef.value?.handleOpen());
                    return;
                } else {
                    state.contextMenuType = '';
                }
            }
        }
    }
    state.contextMenuType = (side + '-panel') as 'local-panel' | 'remote-panel';
    contextMenuPosition.value = DOMRect.fromRect({ x: e.clientX, y: e.clientY });
    nextTick(() => contextDropdownRef.value?.handleOpen());
}

function handleContextCommand(command: string | number | object) {
    const cmd = String(command);
    if (cmd === 'rename') {
        if (state.contextMenuType === 'local-row') renameLocal();
        else if (state.contextMenuType === 'remote-row') renameRemote();
    } else if (cmd === 'delete') {
        if (state.contextMenuType === 'local-row') deleteLocal();
        else if (state.contextMenuType === 'remote-row') deleteRemote();
    } else if (cmd === 'upload') {
        uploadToRemote();
    } else if (cmd === 'download') {
        downloadToLocal();
    } else if (cmd === 'refresh') {
        if (state.contextMenuType === 'local-panel') refreshLocal();
        else if (state.contextMenuType === 'remote-panel') applyRemotePathAndLoad();
    } else if (cmd === 'newFolder') {
        if (state.contextMenuType === 'local-panel') addDir('local');
        else if (state.contextMenuType === 'remote-panel') addDir('remote');
    }
}

async function loadDrivesView() {
    if (electronAPI.platform !== 'win32') return;
    state.localLoading = true;
    try {
        const drives = await electronAPI.getDrives();
        state.localList = drives.map((d) => ({ name: d, isDirectory: true }));
        state.localPath = '';
        state.localPathShow = t('this-pc');
        state.isDriveRoot = true;
    } catch (err: any) {
        ElMessage.error(t('load-failed') + ': ' + (err?.message || err));
        state.localList = [];
    } finally {
        state.localLoading = false;
    }
}

async function loadLocalDir(targetPath?: string) {
    const pathToLoad = targetPath ?? (state.localPathShow || state.localPath);
    if (!pathToLoad) {
        state.localList = [];
        return;
    }
    state.localLoading = true;
    try {
        const entries = await electronAPI.fsReaddir(pathToLoad);
        const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
        const withSize = await Promise.all(
            entries.map(async (e) => {
                let size: number | undefined;
                if (!e.isDirectory) {
                    try {
                        const full = (pathToLoad.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + e.name).replace(/\//g, pathSep);
                        const stat = await electronAPI.fsStat(full);
                        size = stat.size;
                    } catch {
                        size = undefined;
                    }
                }
                return { ...e, size };
            })
        );
        state.localList = withSize.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        state.localPath = pathToLoad;
        state.localPathShow = pathToLoad;
        state.localSelected = null;
        state.isDriveRoot = false;
    } catch (err: any) {
        ElMessage.error(pathToLoad + " " + t('load-failed') + ': ' + (err?.message || err));
        state.localPathShow = state.localPath;
    } finally {
        state.localLoading = false;
    }
}

async function loadRemoteDir(targetPath?: string) {
    if (!remoteConnected.value || !clientStore.client) {
        state.remoteList = [];
        return;
    }
    const pathToLoad = (targetPath ?? (state.remotePathShow || state.remotePath)).replace(/\\/g, '/').trim() || '/';
    state.remoteLoading = true;
    try {
        const sftp = await ensureSftp();
        if (!sftp) {
            state.remoteList = [];
            return;
        }
        const list = await sftp.readdir(pathToLoad);
        state.remoteList = list.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        state.remotePath = pathToLoad;
        state.remotePathShow = pathToLoad;
        state.remoteSelected = null;
    } catch (err: any) {
        ElMessage.error(pathToLoad + " " + t('load-failed') + ': ' + (err?.message || err));
        state.remotePathShow = state.remotePath;
    } finally {
        state.remoteLoading = false;
    }
}

function refreshLocal() {
    if (electronAPI.platform === 'win32' && state.localPathShow === t('this-pc')) {
        loadDrivesView();
    } else {
        loadLocalDir(state.localPathShow || state.localPath);
    }
}

async function enterDesktop() {
    try {
        const desktop = await electronAPI.getDesktopDir();
        if (desktop) {
            loadLocalDir(desktop);
        }
    } catch (e: any) {
        ElMessage.error(e?.message || e);
    }
}

async function enterThisPc() {
    if (!isWin.value) return;
    await loadDrivesView();
}

function pickLocalDir() {
    electronAPI.showOpenDialog({ properties: ['openDirectory'] }).then((res) => {
        if (!res.canceled && res.filePaths?.[0]) {
            loadLocalDir(res.filePaths[0]);
        }
    });
}

function localGoUp() {
    if (!localPathParts.value.length) return;
    if (electronAPI.platform === 'win32' && isLocalDriveRoot.value) {
        loadDrivesView();
        return;
    }
    const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
    let newPath = localPathParts.value.slice(0, -1).join(pathSep);
    if (!newPath && pathSep === '\\') newPath = 'C:\\';
    if (electronAPI.platform === 'win32' && /^[a-zA-Z]:$/.test(newPath)) {
        newPath = newPath + '\\';
    }
    loadLocalDir(newPath);
}

function localEnter(item: { name: string; isDirectory: boolean }) {
    if (!item.isDirectory) return;
    if (!state.localPath || state.isDriveRoot) {
        loadLocalDir(item.name);
        return;
    }
    const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
    const newPath = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + item.name).replace(/\//g, pathSep);
    loadLocalDir(newPath);
}

function remoteGoUp() {
    const p = state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '/';
    const parts = p.split('/').filter(Boolean);
    if (parts.length <= 1) {
        loadRemoteDir('/');
        return;
    }
    loadRemoteDir('/' + parts.slice(0, -1).join('/'));
}

function remoteEnter(item: { name: string; isDirectory: boolean }) {
    if (!item.isDirectory) return;
    const base = state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '/';
    const newPath = /\/$/.test(base) ? base + item.name : base + '/' + item.name;
    loadRemoteDir(newPath);
}


function applyRemotePathAndLoad() {
    const pathNorm = (state.remotePathShow || state.remotePath).replace(/\\/g, '/').trim() || '/';
    loadRemoteDir(pathNorm);
}

async function deleteLocal() {
    if (!state.localSelected || !state.localPath) return;
    const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
    const full = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + state.localSelected.name).replace(/\//g, pathSep);
    const action = await ElMessageBox.confirm(t('confirm-delete') + ' ' + state.localSelected.name + '?', t('delete'), {
        type: 'warning',
    }).catch(action => action);
    if (action === 'confirm') {
        try {
            const recursive = state.localSelected!.isDirectory;
            await electronAPI.fsRm(full, { recursive });
            ElMessage.success(t('delete-success'));
            state.localSelected = null;
            loadLocalDir();
        } catch (e: any) {
            ElMessage.error(e?.message || e);
        }
    }
}

async function deleteRemote() {
    if (!state.remoteSelected || !clientStore.client) return;
    const full = (state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '') + (state.remotePath === '/' ? '' : '/') + state.remoteSelected.name;
    const action = await ElMessageBox.confirm(t('confirm-delete') + ' ' + state.remoteSelected.name + '?', t('delete'), {
        type: 'warning',
    }).catch(action => action);
    if (action === 'confirm') {
        const sftp = await ensureSftp();
        if (!sftp) return;
        try {
            const res = state.remoteSelected!.isDirectory
                ? await sftp.rmdir(full)
                : await sftp.unlink(full);
            if (res !== true) {
                ElMessage.error(String(res));
                return;
            }
            ElMessage.success(t('delete-success'));
            state.remoteSelected = null;
            loadRemoteDir();
        } catch (e: any) {
            ElMessage.error(e?.message || e);
        }
    }
}

function renameLocal() {
    if (!state.localSelected || state.localSelected.name === '..') return;
    state.localSelected.isEdit = true;
    state.localSelected.renameValue = state.localSelected!.name;
    focusRename('local');
}

function renameRemote() {
    if (!state.remoteSelected || state.remoteSelected.name === '..') return;
    state.remoteSelected.isEdit = true;
    state.remoteSelected.renameValue = state.remoteSelected!.name;
    focusRename('remote');
}
const localTableRef = ref<InstanceType<typeof ElTable>>();
const remoteTableRef = ref<InstanceType<typeof ElTable>>();
function focusRename(side: 'local' | 'remote') {
    nextTick(() => {
        if (side === 'local') {
            const input = localTableRef.value?.$el?.querySelector('.inline-rename-input input');
            if (input) {
                input.focus();
            }
        } else {
            const input = remoteTableRef.value?.$el?.querySelector('.inline-rename-input input');
            if (input) {
                input.focus();
            }
        }
    })
}

function addDir(side: 'local' | 'remote') {
    if (side === 'local') {
        state.showNewLocalDir = true;
    } else {
        state.showNewRemoteDir = true;
    }
    focusRename(side);
}
async function confirmRename(side: 'local' | 'remote', row: LocalFileItem | RemoteFileItem) {
    if (!row) return;
    if (row.name === row.renameValue || !row.renameValue?.trim()) {
        row.isEdit = false;
        row.renameValue = row.name;
        state.showNewLocalDir = false;
        state.showNewRemoteDir = false;
        return
    };
    if (side === 'local') {
        const { renameValue: newName, name: oldName } = row;
        if (row.isNew) {
            try {
                const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
                const full = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + newName).replace(/\//g, pathSep);
                await electronAPI.fsMkdir(full);
                ElMessage.success(t('create-success'));
                loadLocalDir();
                state.showNewLocalDir = false;
            } catch (e: any) {
                ElMessage.error(e?.message || e);
            }
        } else {
            const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
            const oldFull = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + oldName).replace(/\//g, pathSep);
            const newFull = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + newName).replace(/\//g, pathSep);
            try {
                await electronAPI.fsRename(oldFull, newFull);
                ElMessage.success(t('rename-success'));
                state.localSelected = null;
                loadLocalDir();
            } catch (e: any) {
                ElMessage.error(e?.message || e);
            }
        }
    } else if (side === 'remote') {
        const { renameValue: newName, name: oldName } = row;
        if (row.isNew) {
            const sftp = await ensureSftp();
            if (!sftp) return;
            try {
                const full = (state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '') + (state.remotePath === '/' ? '' : '/') + name;
                const res = await sftp.mkdir(full);
                if (res !== true) {
                    ElMessage.error(String(res));
                    return;
                }
                ElMessage.success(t('create-success'));
                state.remoteSelected = null;
                loadRemoteDir();
                state.showNewRemoteDir = false;
            } catch (e: any) {
                ElMessage.error(e?.message || e);
            }
        } else {
            const base = state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '';
            const oldFull = (base ? base + '/' : '') + oldName;
            const newFull = (base ? base + '/' : '') + newName;
            const sftp = await ensureSftp();
            if (!sftp) return;
            try {
                const res = await sftp.rename(oldFull, newFull);
                if (res !== true) {
                    ElMessage.error(String(res));
                    return;
                }
                ElMessage.success(t('rename-success'));
                state.remoteSelected = null;
                loadRemoteDir();
            } catch (e: any) {
                ElMessage.error(e?.message || e);
            }
        }
    }
}

async function uploadToRemote() {
    if (!state.localSelected || !remoteConnected.value || !clientStore.client || !state.localPath?.trim()) return;
    const pathSep = electronAPI.platform === 'win32' ? '\\' : '/';
    const localFull = (state.localPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + state.localSelected.name).replace(/\//g, pathSep);
    const targetDir = state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '');

    const status = await clientStore.client.uploadFile(localFull, targetDir, { quiet: false, uuid: v4() });
    if (status === true && state.remotePath === targetDir) {
        loadRemoteDir();
    }
}

async function downloadToLocal() {
    if (!state.remoteSelected || !remoteConnected.value || !clientStore.client || !state.localPath) return;
    const remotePath = state.remotePath.replace(/\\/g, '/').replace(/\/+$/, '') || '';
    const remoteFull = (/\/$/.test(remotePath) ? (remotePath + state.remoteSelected.name) : (remotePath + '/' + state.remoteSelected.name));
    const localDir = state.localPath;

    const status = await clientStore.client.downloadFile(localDir, remoteFull, { quiet: false, uuid: v4() });
    if (status === true && state.localPath === localDir) {
        loadLocalDir();
        return;
    }
}


watch(remoteConnected, (v) => {
    if (v) {
        initSftp().then(() => loadRemoteDir());
    } else {
        clearSftp();
    }
});

onMounted(async () => {
    try {
        const desktop = await electronAPI.getDesktopDir();
        if (desktop) {
            loadLocalDir(desktop);
        }
    } catch {
        state.localPath = '';
        state.localPathShow = '';
    }
    if (remoteConnected.value) {
        initSftp().then(() => loadRemoteDir());
    }
});

onBeforeUnmount(() => {
    clearSftp();
});
</script>

<style scoped lang="less">
.sftp-page {
    max-height: 100%;
    display: flex;
    flex-direction: column;
    padding: @gap;
    height: 100%;
}

.sftp-panels {
    display: flex;
    gap: @gap * 2;
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

.sftp-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-bg-color);

    .panel-header {
        display: flex;
        align-items: center;
        gap: @gap;
        padding: @gap @gap * 2;
        border-bottom: 1px solid var(--el-border-color-lighter);

        .panel-title {
            font-weight: 600;
        }
    }

    .panel-path {
        display: flex;
        align-items: center;
        gap: @gap;
        padding: @gap;
        border-bottom: 1px solid var(--el-border-color-lighter);

        :deep(.el-input) {
            flex: 1;
        }
    }

    .panel-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: @gap;
        padding: @gap;
        border-bottom: 1px solid var(--el-border-color-lighter);
    }

    .panel-list {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        padding: @gap;
        display: flex;
        flex-direction: column;

        .list-loading,
        .list-hint {
            color: var(--el-text-color-secondary);
            padding: @gap * 2;
        }

        .file-table {
            flex: 1;
            height: 100%;

            .table-name {
                display: inline-flex;
                align-items: center;
                gap: @gap;

                .name-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    gap: @gap;
                    min-width: 0;

                    .inline-rename-input {
                        width: 120px;
                    }
                }
            }

            :deep(.el-table__row) {
                cursor: pointer;
            }
        }
    }
}
</style>
