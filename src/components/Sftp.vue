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
                    <el-input v-model="state.localPathShow" size="small" @keypress.enter="enterLocal">
                        <template #prepend>{{ t('path') }}</template>
                    </el-input>
                    <el-button size="small" @click="enterLocal" :icon="Refresh">
                        {{ t('refresh') }}
                    </el-button>
                </div>
                <div class="panel-toolbar">
                    <el-button size="small" :icon="Back" :disabled="!hasLocalParent" @click="localGoUp"
                        :loading="state.localLoading">
                    </el-button>
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
                    <el-tooltip placement="top"
                        :disabled="!state.localSelected || !remoteConnected || state.isDriveRoot || state.localSelected.name === '..'">
                        <template #content>
                            <p>
                                {{ t('upload-to-remote-hint', {
                                    name: state.localSelected?.name ?? '', remotePath:
                                        state.remotePath
                                }) }}
                            </p>
                        </template>
                        <el-button size="small" :icon="Upload"
                            :disabled="!state.localSelected || !remoteConnected || state.isDriveRoot || state.localSelected.name === '..'"
                            type="primary" @click="throttleUploadToRemote">
                            {{ t('upload') }}
                        </el-button>
                    </el-tooltip>
                </div>
                <div class="panel-list" @contextmenu.prevent="onPanelContextMenu($event, 'local')"
                    :class="{ 'drop-zone-active': state.localPanelDragOver }" @dragover.prevent="onLocalPanelDragOver"
                    @dragleave="onLocalPanelDragLeave" @drop.prevent="onLocalPanelDrop">
                    <div v-if="!state.localPath && !state.localList.length" class="list-hint">
                        {{ t('select-dir-hint') }}
                    </div>
                    <el-table v-loading="state.localLoading" v-else :data="localTableData" :row-key="rowKey"
                        :row-class-name="localRowClassName" highlight-current-row :current-row-key="localCurrentRowKey"
                        @current-change="state.localSelected = $event" @row-dblclick="onLocalRowDblclick"
                        @row-contextmenu="onLocalRowContextmenu" class="file-table no-select" size="small"
                        ref="localTableRef">
                        <el-table-column :label="t('Name')" min-width="0" sortable prop="name" :show-overflow-tooltip="{
                            appendTo: 'body'
                        }">
                            <template #default="{ row }">
                                <div class="table-name"
                                    :data-drop-target="row.isParent ? 'folder' : (!row.isEdit && !row.isNew && !state.isDriveRoot && row.isDirectory ? 'folder' : undefined)"
                                    :data-drop-name="row.isParent ? '..' : (!row.isParent && !row.isEdit && !row.isNew && !state.isDriveRoot && row.isDirectory ? row.name : undefined)"
                                    :draggable="!row.isParent && !row.isEdit && !row.isNew && !!state.localPath && !state.isDriveRoot"
                                    @dragstart="onLocalDragStart($event, row)"
                                    @dragover.prevent="onLocalFolderDragOver($event, row)"
                                    @dragleave="onLocalFolderDragLeave">
                                    <el-icon v-if="row.isParent">
                                        <Back />
                                    </el-icon>
                                    <el-icon v-else-if="row.isDirectory">
                                        <Folder />
                                    </el-icon>
                                    <el-icon v-else>
                                        <Document />
                                    </el-icon>
                                    <el-input v-if="!row.isParent && row.isEdit" v-model="row.renameValue" size="small"
                                        class="inline-rename-input" @keypress.enter="confirmRename('local', row)"
                                        @blur="confirmRename('local', row)" />
                                    <span class="ellipsis" v-else>{{ row.name }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="size" :label="t('size')" width="100" align="right" sortable>
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
                    <el-input v-model="state.remotePathShow" size="small" @keypress.enter="enterRemote">
                        <template #prepend>{{ t('remote-path') }}</template>
                    </el-input>
                    <el-button size="small" @click="enterRemote" :icon="Refresh">
                        {{ t('refresh') }}
                    </el-button>
                </div>
                <div class="panel-toolbar">
                    <el-button size="small" :icon="Back" :disabled="!hasRemoteParent" @click="remoteGoUp"
                        :loading="state.remoteLoading">
                    </el-button>
                    <el-button size="small" :icon="FolderAdd" :disabled="!remoteConnected" @click="addDir('remote')">
                        {{ t('new-folder') }}
                    </el-button>
                    <el-button size="small" :icon="Delete"
                        :disabled="!state.remoteSelected || !remoteConnected || state.remoteSelected.name === '..'"
                        @click="deleteRemote">
                        {{ t('delete') }}
                    </el-button>
                    <el-button size="small" :icon="Edit"
                        :disabled="!state.remoteSelected || state.remoteSelected.name === '..' || !remoteConnected"
                        @click="renameRemote">
                        {{ t('rename') }}
                    </el-button>
                    <el-tooltip placement="top"
                        :disabled="!state.remoteSelected || !remoteConnected || state.isDriveRoot || state.remoteSelected.name === '..'">
                        <template #content>
                            <p>
                                {{ t('download-to-local-hint', {
                                    name: state.remoteSelected?.name ?? '', localPath:
                                        state.localPath
                                }) }}
                            </p>
                        </template>
                        <el-button size="small" :icon="Download"
                            :disabled="!state.remoteSelected || !remoteConnected || state.isDriveRoot || state.remoteSelected.name === '..'"
                            type="primary" @click="throttleDownloadToLocal">
                            {{ t('download') }}
                        </el-button>
                    </el-tooltip>
                </div>
                <div class="panel-list" @contextmenu.prevent="onPanelContextMenu($event, 'remote')"
                    :class="{ 'drop-zone-active': state.remotePanelDragOver }" @dragover.prevent="onRemotePanelDragOver"
                    @dragleave="onRemotePanelDragLeave" @drop.prevent="onRemotePanelDrop">
                    <div v-if="!remoteConnected" class="list-hint">{{ t('connect-first-hint') }}</div>
                    <el-table v-loading="state.remoteLoading" v-else :data="remoteTableData" :row-key="rowKey"
                        :row-class-name="remoteRowClassName" highlight-current-row
                        :current-row-key="remoteCurrentRowKey" @current-change="state.remoteSelected = $event"
                        @row-dblclick="onRemoteRowDblclick" @row-contextmenu="onRemoteRowContextmenu"
                        class="file-table no-select" size="small" ref="remoteTableRef">
                        <el-table-column :label="t('Name')" min-width="0" sortable prop="name" :show-overflow-tooltip="{
                            appendTo: 'body'
                        }">
                            <template #default="{ row }">
                                <div class="table-name"
                                    :data-drop-target="row.isParent ? 'folder' : (!row.isEdit && !row.isNew && row.isDirectory ? 'folder' : undefined)"
                                    :data-drop-name="row.isParent ? '..' : (!row.isEdit && !row.isNew && row.isDirectory ? row.name : undefined)"
                                    :draggable="!row.isParent && !row.isEdit"
                                    @dragstart="onRemoteDragStart($event, row)"
                                    @dragover.prevent="onRemoteFolderDragOver($event, row)"
                                    @dragleave="onRemoteFolderDragLeave">
                                    <el-icon v-if="row.isParent">
                                        <Back />
                                    </el-icon>
                                    <el-icon v-else-if="row.isDirectory">
                                        <Folder />
                                    </el-icon>
                                    <el-icon v-else>
                                        <Document />
                                    </el-icon>
                                    <el-input v-if="!row.isParent && row.isEdit" v-model="row.renameValue" size="small"
                                        class="inline-rename-input" @keypress.enter="confirmRename('remote', row)"
                                        @blur="confirmRename('remote', row)" />
                                    <span class="ellipsis" v-else>{{ row.name }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="size" :label="t('size')" width="100" align="right" sortable>
                            <template #default="{ row }">
                                <span v-if="!row.isDirectory && !row.isParent && row.size != null">
                                    {{ formatSize(row.size) }}
                                </span>
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
                        <el-dropdown-item :icon="Edit" command="rename"
                            :disabled="state.isDriveRoot || state.localSelected?.name === '..'">
                            {{ t('rename') }}
                        </el-dropdown-item>
                        <el-dropdown-item :icon="Delete" command="delete"
                            :disabled="state.isDriveRoot || state.localSelected?.name === '..'">
                            {{ t('delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="state.contextMenuType === 'local-row'"
                            :disabled="state.isDriveRoot || !remoteConnected || state.localSelected?.name === '..'"
                            :icon="Upload" command="upload">
                            {{ t('upload') }}
                        </el-dropdown-item>
                    </template>
                    <template v-if="state.contextMenuType === 'remote-row'">
                        <el-dropdown-item :icon="Edit" command="rename" :disabled="state.remoteSelected?.name === '..'">
                            {{ t('rename') }}
                        </el-dropdown-item>
                        <el-dropdown-item :icon="Delete" command="delete"
                            :disabled="state.remoteSelected?.name === '..'">
                            {{ t('delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="state.contextMenuType === 'remote-row'" :icon="Download"
                            :disabled="state.remoteSelected?.name === '..'" command="download">
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
import { formatSize, throttle } from '@/utils';
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

type FileItem = { name: string; isDirectory: boolean; size?: number, mtime?: number, isEdit?: boolean, renameValue?: string, isNew?: boolean };

const state = reactive({
    localPathShow: '',
    localPath: '',
    localList: [] as FileItem[],
    localLoading: false,
    localSelected: null as FileItem | null,
    isDriveRoot: false,

    remotePathShow: '/',
    remotePath: '/',
    remoteList: [] as FileItem[],
    remoteLoading: false,
    remoteSelected: null as FileItem | null,

    showNewLocalDir: false,
    showNewRemoteDir: false,

    contextMenuType: '' as '' | 'local-row' | 'remote-row' | 'local-panel' | 'remote-panel',

    localPanelDragOver: false,
    remotePanelDragOver: false,
    /** 拖拽悬停时的目标文件夹名（用于高亮该行） */
    localDropTargetFolder: null as string | null,
    remoteDropTargetFolder: null as string | null,
});

const remoteConnected = computed(() => clientStore.status === 2);
const isWin = computed(() => electronAPI.platform === 'win32');

const localPathParts = computed(() => {
    const p = state.localPath;
    const step = electronAPI.platform === 'win32' ? '\\' : '/'
    return p ? p.split(step).filter(Boolean) : [];
});

type Row = FileItem & { isParent?: boolean };

/** Windows 下是否为盘符根目录（如 C:\） */
const isLocalDriveRoot = computed(() => {
    if (electronAPI.platform !== 'win32') return false;
    return localPathParts.value.length === 1;
});
const hasLocalParent = computed(() => {
    return electronAPI.platform === 'win32' && isLocalDriveRoot.value || localPathParts.value.length > 0;
});
const localTableData = computed<Row[]>(() => {
    const rows: Row[] = [];
    if (hasLocalParent.value) {
        rows.push({ name: '..', isDirectory: true, isParent: true });
    }
    if (state.showNewLocalDir) {
        rows.push({ name: '', isDirectory: true, isEdit: true, renameValue: '', isNew: true });
    }
    state.localList.forEach((item) => rows.push({ ...item, isParent: false }));
    return rows;
});

const hasRemoteParent = computed(() => {
    return state.remotePath !== '/' && state.remotePath !== '';
});
const remoteTableData = computed<Row[]>(() => {
    const rows: Row[] = [];
    if (hasRemoteParent.value) {
        rows.push({ name: '..', isDirectory: true, isParent: true });
    }
    if (state.showNewRemoteDir) {
        rows.push({ name: '', isDirectory: true, isEdit: true, renameValue: '', isNew: true });
    }
    state.remoteList.forEach((item) => rows.push({ ...item, isParent: false }));
    return rows;
});

const parentKey = '$$__parent__$$';
function rowKey(row: Row) {
    return row.isParent ? parentKey : row.name;
}

/** 本地表格行类名：拖拽悬停到该文件夹行或“上一级”行时高亮 */
function localRowClassName({ row }: { row: Row }) {
    if (row.isParent) return state.localDropTargetFolder === '..' ? 'drop-target-folder-row' : '';
    return !row.isEdit && row.isDirectory && row.name === state.localDropTargetFolder ? 'drop-target-folder-row' : '';
}
/** 远程表格行类名：拖拽悬停到该文件夹行或“上一级”行时高亮 */
function remoteRowClassName({ row }: { row: Row }) {
    if (row.isParent) return state.remoteDropTargetFolder === '..' ? 'drop-target-folder-row' : '';
    return !row.isEdit && row.isDirectory && row.name === state.remoteDropTargetFolder ? 'drop-target-folder-row' : '';
}

const localCurrentRowKey = computed(() => {
    const sel = state.localSelected;
    if (!sel) return undefined;
    return (sel as Row).isParent ? parentKey : sel.name;
});
const remoteCurrentRowKey = computed(() => {
    const sel = state.remoteSelected;
    if (!sel) return undefined;
    return (sel as Row).isParent ? parentKey : sel.name;
});

/** 右键菜单：虚拟触发位置（el-dropdown 虚拟触发用） */
const contextMenuPosition = ref({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
const triggerRef = ref({
    getBoundingClientRect: () => contextMenuPosition.value,
});
const contextDropdownRef = ref<{ handleOpen: () => void } | null>(null);

function onLocalRowDblclick(row: Row) {
    if (row.isParent) localGoUp();
    else localEnter(row);
}
function onRemoteRowDblclick(row: Row) {
    if (row.isParent) remoteGoUp();
    else remoteEnter(row);
}

function onPanelContextMenu(e: MouseEvent, side: 'local' | 'remote') {
    state.contextMenuType = (side + '-panel') as 'local-panel' | 'remote-panel';
    contextMenuPosition.value = DOMRect.fromRect({ x: e.clientX, y: e.clientY });
    nextTick(() => contextDropdownRef.value?.handleOpen());
}

function onLocalRowContextmenu(row: any, column: any, e: MouseEvent) {
    if (row.name === '..' || state.isDriveRoot) return;
    e.preventDefault();
    e.stopPropagation();
    state.localSelected = row;
    state.contextMenuType = 'local-row';
    contextMenuPosition.value = DOMRect.fromRect({ x: e.clientX, y: e.clientY });
    nextTick(() => contextDropdownRef.value?.handleOpen());
}

function onRemoteRowContextmenu(row: any, column: any, e: MouseEvent) {
    if (row.name === '..') return;
    e.preventDefault();
    e.stopPropagation();
    state.remoteSelected = row;
    state.contextMenuType = 'remote-row';
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
        if (state.contextMenuType === 'local-panel') enterLocal();
        else if (state.contextMenuType === 'remote-panel') enterRemote();
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
    let pathToLoad = targetPath ?? (state.localPathShow || state.localPath);
    if (!pathToLoad) {
        state.localList = [];
        return;
    }
    state.localLoading = true;
    try {
        pathToLoad = formatPath(pathToLoad, true);
        const entries = await electronAPI.fsReaddir(pathToLoad);
        const withSize = await Promise.all(
            entries.map(async (e) => {
                let size: number | undefined;
                if (!e.isDirectory) {
                    try {
                        const full = pathToLoad + '/' + e.name;
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
    let pathToLoad = targetPath ?? (state.remotePathShow || state.remotePath);
    pathToLoad = formatPath(pathToLoad);
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

const enterLocal = throttle(() => {
    if (electronAPI.platform === 'win32' && state.localPathShow === t('this-pc')) {
        loadDrivesView();
    } else {
        loadLocalDir(state.localPathShow || state.localPath);
    }
})

async function enterDesktop() {
    try {
        const desktop = await electronAPI.appGetPath('desktop');
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
    const newPath = getParentLocalPath();
    if (!newPath) return;
    loadLocalDir(newPath);
}

function localEnter(item: { name: string; isDirectory: boolean }) {
    if (!item.isDirectory) return;
    if (!state.localPath || state.isDriveRoot) {
        loadLocalDir(item.name);
        return;
    }
    let step = electronAPI.platform === 'win32' ? '\\' : '/'
    const newPath = state.localPath + (state.localPath.endsWith(step) ? '' : step) + item.name;
    loadLocalDir(newPath);
}

function remoteGoUp() {
    const p = state.remotePath;
    const parts = p.split('/').filter(Boolean);
    if (parts.length <= 1) {
        loadRemoteDir('/');
        return;
    }
    loadRemoteDir('/' + parts.slice(0, -1).join('/'));
}

function remoteEnter(item: { name: string; isDirectory: boolean }) {
    if (!item.isDirectory) return;
    const base = state.remotePath;
    const newPath = base + '/' + item.name;
    loadRemoteDir(newPath);
}

const enterRemote = throttle(() => {
    loadRemoteDir()
})

/** 本地当前路径的父路径；若已是驱动器根则返回 null（不允许移动到驱动器根） */
function getParentLocalPath(): string | null {
    const parts = localPathParts.value;
    if (parts.length <= 1) return null;
    const parentParts = parts.slice(0, -1);
    const step = electronAPI.platform === 'win32' ? '\\' : '/'
    if (parentParts.length === 1 && electronAPI.platform === 'win32') {
        return parentParts[0] + step;
    }
    let parentPath = parentParts.join(step);
    return parentPath || '/';
}

async function deleteLocal() {
    if (!state.localSelected || !state.localPath) return;
    const full = state.localPath + '/' + state.localSelected.name;
    const action = await ElMessageBox.confirm(t('confirm-delete-name', { name: state.localSelected.name }), t('delete'), {
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
    const full = state.remotePath + '/' + state.remoteSelected.name;
    const action = await ElMessageBox.confirm(t('confirm-delete-name', { name: state.remoteSelected.name }), t('delete'), {
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
    setTimeout(() => {
        const input = side === 'local' ? localTableRef.value?.$el?.querySelector('.inline-rename-input input') : remoteTableRef.value?.$el?.querySelector('.inline-rename-input input');
        if (input) {
            input.focus();
            input.select();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function addDir(side: 'local' | 'remote') {
    if (side === 'local') {
        state.showNewLocalDir = true;
    } else {
        state.showNewRemoteDir = true;
    }
    focusRename(side);
}
async function confirmRename(side: 'local' | 'remote', row: FileItem | FileItem) {
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
                const full = state.localPath + '/' + newName;
                await electronAPI.fsMkdir(full);
                ElMessage.success(t('create-success'));
                loadLocalDir();
                state.showNewLocalDir = false;
            } catch (e: any) {
                ElMessage.error(e?.message || e);
                state.showNewLocalDir = false;
            }
        } else {
            const oldFull = state.localPath + '/' + oldName;
            const newFull = state.localPath + '/' + newName;
            try {
                await electronAPI.fsRename(oldFull, newFull);
                ElMessage.success(t('rename-success'));
                state.localSelected = null;
                loadLocalDir();
            } catch (e: any) {
                ElMessage.error(e?.message || e);
                row.isEdit = false;
                row.renameValue = row.name;
            }
        }
    } else if (side === 'remote') {
        const { renameValue: newName, name: oldName } = row;
        if (row.isNew) {
            const sftp = await ensureSftp();
            if (!sftp) return;
            try {
                const full = state.remotePath + '/' + name;
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
                state.showNewRemoteDir = false;
            }
        } else {
            const base = state.remotePath;
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
                row.isEdit = false;
                row.renameValue = row.name;
            }
        }
    }
}

async function uploadToRemote() {
    if (!state.localSelected || !remoteConnected.value || !clientStore.client || !state.localPath?.trim()) return;
    const localFull = state.localPath + '/' + state.localSelected.name;
    const targetDir = state.remotePath;

    const status = await clientStore.client.uploadFile(localFull, targetDir, { quiet: false, uuid: v4() });
    const nowRemotePath = state.remotePath;
    if (status === true && nowRemotePath === targetDir) {
        loadRemoteDir();
    }
}
const throttleUploadToRemote = throttle(uploadToRemote);

async function downloadToLocal() {
    if (!state.remoteSelected || !remoteConnected.value || !clientStore.client || !state.localPath) return;
    const remotePath = state.remotePath;
    const remoteFull = remotePath + '/' + state.remoteSelected.name;
    const localDir = state.localPath;

    const status = await clientStore.client.downloadFile(localDir, remoteFull, { quiet: false, uuid: v4() });
    if (status === true && state.localPath === localDir) {
        loadLocalDir();
        return;
    }
}
const throttleDownloadToLocal = throttle(downloadToLocal);

watch(remoteConnected, (v) => {
    if (v) {
        initSftp().then(() => loadRemoteDir());
    } else {
        clearSftp();
    }
});

onMounted(async () => {
    try {
        const desktop = await electronAPI.appGetPath('desktop');
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

//----------------拖拽--------------------
const SFTP_DRAG_LOCAL = 'application/x-sftp-local';
const SFTP_DRAG_REMOTE = 'application/x-sftp-remote';
function onLocalDragStart(e: DragEvent, row: Row) {
    if (row.isParent || row.isEdit || row.isNew || !state.localPath || state.isDriveRoot) return;
    const basePath = state.localPath;
    const payload = { type: 'local' as const, basePath, name: row.name, isDirectory: row.isDirectory };
    e.dataTransfer!.setData(SFTP_DRAG_LOCAL, JSON.stringify(payload));
    e.dataTransfer!.effectAllowed = 'move';
}

function onRemoteDragStart(e: DragEvent, row: Row) {
    if (row.isParent || row.isEdit) return;
    const basePath = state.remotePath;
    const payload = { type: 'remote' as const, basePath, name: row.name, isDirectory: row.isDirectory };
    e.dataTransfer!.setData(SFTP_DRAG_REMOTE, JSON.stringify(payload));
    e.dataTransfer!.effectAllowed = 'move';
}

/** 本地文件夹行 dragover：拖拽远程文件（下载到该文件夹）或本地文件（移动到该文件夹/上一级）时高亮 */
function onLocalFolderDragOver(e: DragEvent, row: Row) {
    const types = e.dataTransfer?.types;
    if (row.isParent) {
        if (!state.isDriveRoot && types?.includes(SFTP_DRAG_LOCAL)) {
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            state.localDropTargetFolder = '..';
        }
        return;
    }
    if (row.isEdit || row.isNew || state.isDriveRoot || !row.isDirectory) return;
    if (!types?.includes(SFTP_DRAG_REMOTE) && !types?.includes(SFTP_DRAG_LOCAL)) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    state.localDropTargetFolder = row.name;
}

function onLocalFolderDragLeave(e: DragEvent) {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget instanceof HTMLElement && relatedTarget.closest?.('[data-drop-target="folder"], [data-drop-target="parent"]')) return;
    state.localDropTargetFolder = null;
}

/** 远程文件夹行 dragover：拖拽本地文件（上传到该文件夹）或远程文件（移动到该文件夹/上一级）时高亮 */
function onRemoteFolderDragOver(e: DragEvent, row: Row) {
    const types = e.dataTransfer?.types;
    if (row.isParent) {
        if (types?.includes(SFTP_DRAG_REMOTE)) {
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            state.remoteDropTargetFolder = '..';
        }
        return;
    }
    if (row.isEdit || !row.isDirectory) return;
    if (!types?.includes(SFTP_DRAG_LOCAL) && !types?.includes(SFTP_DRAG_REMOTE)) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    state.remoteDropTargetFolder = row.name;
}

function onRemoteFolderDragLeave(e: DragEvent) {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget instanceof HTMLElement && relatedTarget.closest?.('[data-drop-target="folder"], [data-drop-target="parent"]')) return;
    state.remoteDropTargetFolder = null;
}

function onRemotePanelDragOver(e: DragEvent) {
    const types = e.dataTransfer?.types;
    if (types?.includes(SFTP_DRAG_LOCAL) || types?.includes(SFTP_DRAG_REMOTE)) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        state.remotePanelDragOver = true;
    }
}

function onRemotePanelDragLeave() {
    state.remotePanelDragOver = false;
    state.remoteDropTargetFolder = null;
}

/** 从 drop 事件中解析是否落在某文件夹或“上一级”行上，返回文件夹名或 '..'（上一级），否则 null */
function getDropTargetFolderName(e: DragEvent): string | null {
    const el = (e.target as HTMLElement)?.closest?.('[data-drop-target="folder"]');
    if (!el) return null;
    return el.getAttribute('data-drop-name');
}

async function onRemotePanelDrop(e: DragEvent) {
    state.remotePanelDragOver = false;
    state.remoteDropTargetFolder = null;
    const baseRemote = state.remotePath;
    const folderName = getDropTargetFolderName(e);

    // 本地 → 远程：上传到当前目录或指定文件夹
    const rawLocal = e.dataTransfer?.getData(SFTP_DRAG_LOCAL);
    if (rawLocal) {
        if (!remoteConnected.value || !clientStore.client) return;
        const { type, basePath, name } = JSON.parse(rawLocal);
        if (type !== 'local' || !basePath || !name) return;
        const localFull = basePath + '/' + name;
        const targetDir = folderName ? (baseRemote + '/' + folderName).replace(/\/+/g, '/') : baseRemote;
        const status = await clientStore.client.uploadFile(localFull, targetDir, { quiet: false, uuid: v4() });
        if (status === true) loadRemoteDir();
        return;
    }

    // 远程 → 远程文件夹：在服务器上移动到指定文件夹或上一级
    const rawRemote = e.dataTransfer?.getData(SFTP_DRAG_REMOTE);

    if (rawRemote && folderName && remoteConnected.value) {
        const { type, basePath, name } = JSON.parse(rawRemote);
        if (type !== 'remote' || !name) return;
        const oldRemote = (basePath ? basePath + '/' : '') + name;
        let targetDir: string;
        if (folderName === '..') {
            const parts = baseRemote.split('/').filter(Boolean);
            targetDir = parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
        } else {
            targetDir = baseRemote + '/' + folderName;
        }
        const newRemote = targetDir + '/' + name;
        if (newRemote === oldRemote) return;
        if (newRemote.startsWith(oldRemote + '/')) {
            ElMessage.warning(t('move-into-self-warn'));
            return;
        }
        const sftp = await ensureSftp();
        if (!sftp) return;
        try {
            const res = await sftp.rename(oldRemote, newRemote);
            if (res !== true) {
                ElMessage.error(String(res));
                return;
            }
            ElMessage.success(t('move-success'));
            loadRemoteDir();
        } catch (err: any) {
            ElMessage.error(err?.message || String(err));
        }
    }
}

function onLocalPanelDragOver(e: DragEvent) {
    const types = e.dataTransfer?.types;
    if (types?.includes(SFTP_DRAG_REMOTE) || types?.includes(SFTP_DRAG_LOCAL)) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        state.localPanelDragOver = true;
    }
}

function onLocalPanelDragLeave() {
    state.localPanelDragOver = false;
    state.localDropTargetFolder = null;
}

async function onLocalPanelDrop(e: DragEvent) {
    state.localPanelDragOver = false;
    state.localDropTargetFolder = null;
    const baseLocal = state.localPath;
    const folderName = getDropTargetFolderName(e);

    // 远程 → 本地：下载到当前目录或指定文件夹
    const rawRemote = e.dataTransfer?.getData(SFTP_DRAG_REMOTE);
    if (rawRemote) {
        if (!remoteConnected.value || !clientStore.client || !state.localPath?.trim()) {
            if (!state.localPath?.trim()) ElMessage.warning(t('select-dir-hint'));
            return;
        }
        const { type, basePath, name } = JSON.parse(rawRemote);
        if (type !== 'remote' || !name) return;
        const remotePath = (basePath ? basePath + '/' : '') + name;
        const localDir = folderName ? (baseLocal + '/' + folderName) : baseLocal;
        const status = await clientStore.client.downloadFile(localDir, remotePath, { quiet: false, name, uuid: v4() });
        if (status === true) loadLocalDir();
        return;
    }

    // 本地 → 本地文件夹：移动到指定文件夹或上一级
    const rawLocal = e.dataTransfer?.getData(SFTP_DRAG_LOCAL);
    if (rawLocal && folderName) {
        if (!state.localPath?.trim() || state.isDriveRoot) return;
        const { type, basePath, name } = JSON.parse(rawLocal);
        if (type !== 'local' || !basePath || !name) return;
        const oldFull = basePath + '/' + name;
        let newFull: string;
        if (folderName === '..') {
            const parentPath = getParentLocalPath();
            if (parentPath === null) {
                ElMessage.warning(t('move-to-drive-root-disallowed'));
                return;
            }
            newFull = parentPath + '/' + name;
        } else {
            newFull = baseLocal + '/' + folderName + '/' + name;
        }

        if (formatPath(newFull, true) === formatPath(oldFull, true)) return;
        if (newFull.startsWith(oldFull + '/') || newFull.startsWith(oldFull + '/')) {
            ElMessage.warning(t('move-into-self-warn'));
            return;
        }
        try {
            await electronAPI.fsRename(oldFull, newFull);
            ElMessage.success(t('move-success'));
            loadLocalDir();
        } catch (err: any) {
            ElMessage.error(err?.message || String(err));
        }
    }
}

function formatPath(path: string, isLocal: boolean = false) {
    const step = isLocal && electronAPI.platform === 'win32' ? '\\' : '/'
    const parts = path.replace(/\\/g, step).replace(/\/+$/, '').split(step).filter(Boolean);
    const normalized = parts.join(step) || step;
    if (/^[a-zA-Z]:/.test(normalized)) {
        if (/^[a-zA-Z]:$/.test(normalized)) {
            return normalized + '\\'
        }
        return normalized
    } else if (!normalized.startsWith('/')) {
        return '/' + normalized;
    }
    return normalized;
}
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
        border: 2px dashed transparent;
        border-radius: 6px;
        transition: border-color 0.15s, background-color 0.15s;

        &.drop-zone-active {
            border-color: var(--el-color-primary);
            background-color: var(--el-color-primary-light-9);
        }

        .list-loading,
        .list-hint {
            color: var(--el-text-color-secondary);
            padding: @gap * 2;
        }

        .file-table {
            flex: 1;
            height: 100%;

            /* 拖拽悬停到文件夹行时的醒目高亮 */
            :deep(tr.drop-target-folder-row .table-name) {
                background: linear-gradient(90deg, var(--el-color-primary-light-7) 0%, var(--el-color-primary-light-9) 100%) !important;
                border-left: 4px solid var(--el-color-primary) !important;
                box-shadow: inset 0 0 0 2px var(--el-color-primary-light-5);
                font-weight: 600;
            }

            .table-name {
                display: flex;
                align-items: center;
                gap: @gap;
                width: 100%;
                flex-direction: row;
                justify-content: flex-start;

                .inline-rename-input {
                    width: 100%;
                    flex: 1 1 0;
                    min-width: 0;
                }

                .ellipsis {
                    width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }

            :deep(.el-table__row) {
                cursor: pointer;
            }

            .table-name[draggable="true"] {
                cursor: grab;

                &:active {
                    cursor: grabbing;
                }
            }
        }
    }

    .no-select {
        user-select: none;
    }
}
</style>
