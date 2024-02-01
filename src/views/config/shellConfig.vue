<template>
    <base-page>
        <template #form>
            <el-form inline labelPosition="right">
                <el-form-item label='配置文件名称'>
                    <el-input v-model.trim="state.formData.scriptName" @keypress.enter.native="onSearch"
                        placeholder="请输入配置文件名称" clearable />
                </el-form-item>
                <el-form-item label='群组名称'>
                    <el-autocomplete v-model.trim="state.formData.group" @keypress.enter.native="onSearch" clearable
                        placeholder="请输入群组名称" :fetch-suggestions="getGroupOpt" @select="onSearch" @clear="onSearch" />
                </el-form-item>
                <el-form-item>
                    <el-button @Click="onSearch" :icon="Search">查询</el-button>
                    <el-button type="primary" @click="onAdd" :icon="Plus">新增</el-button>
                    <el-button @click="onExport" :icon="Download">导出</el-button>
                    <el-button type="danger" @click="onDelete" :icon="Delete">删除</el-button>
                </el-form-item>
            </el-form>
        </template>

        <Table :data="state.data" :row-key="rowKey" @selection-change="onSelect">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="scriptName" label="配置文件名称" />
            <el-table-column prop="group" label="群组名称" />
            <el-table-column prop="host" label="关联主机" />
            <el-table-column prop="action" label="操作">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">修改</el-link>
                    <el-link type="primary" :underline="false" @click="showDetail(row, true)">复制</el-link>
                    <el-link type="primary" :underline="false" v-if="row.baseScripts && row.baseScripts.length"
                        @click="showShell(row)">查看脚本</el-link>
                    <el-popconfirm title="确定要删除这条数据吗？" @confirm="delItem(row.id)">
                        <template #reference>
                            <el-link type="danger" :underline="false">删除</el-link>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </Table>
        <el-dialog v-if="state.showAdd" :title="state.currentRow?.id ? '修改脚本设置' : '新增脚本设置'" v-model="state.showAdd"
            width="1200px" :close-on-click-modal="false">
            <el-form ref="addForm" :model="state.currentRow" :rules="rules">
                <el-form-item label="配置文件名称" prop="scriptName">
                    <el-input v-model.trim="state.currentRow.scriptName" clearable placeholder="请输入配置文件名称" />
                </el-form-item>
                <el-form-item label="群组名称" prop="group">
                    <el-autocomplete v-model.trim="state.currentRow.group" clearable placeholder="请输入群组名称"
                        :fetch-suggestions="getGroupOpt" />
                </el-form-item>
                <el-form-item label="关联主机" prop="host">
                    <el-autocomplete v-model.trim="state.currentRow.host" clearable placeholder="默认关联0.0.0.0"
                        :fetch-suggestions="getHostOpt" />
                </el-form-item>
                <el-form-item prop="envVar">
                    <template #label>
                        <span>
                            脚本变量配置：<br />
                            <el-button type="primary" @click="state.showInset = true">内置变量</el-button>
                        </span>
                    </template>
                    <el-input type="textarea" :autosize="{ minRows: 6 }" v-model="state.currentRow.envVar"
                        :placeholder="envVarPleaseHold" clearable @blur="handleFormat" :spellcheck="false" />
                </el-form-item>
                <el-row>
                    <el-col :span="12">
                        <el-form-item label="本地目录变量名：" prop="localDir">
                            <el-select v-model="state.currentRow.localDir" placeholder="用于打开本地终端设置默认pwd" clearable
                                style="width: 250px;">
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="目标目录变量名：" prop="mainPath">
                            <el-select v-model="state.currentRow.mainPath" placeholder="用于上传文件的默认远程目录" clearable
                                style="width: 250px;">
                                <el-option v-for="(item, index) in state.parseEnvVarOpt" :key="item + index" :label="item"
                                    :value="item" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item style="margin-bottom: 8px;">
                    <template #label>
                        <div>脚本配置（添加的脚步将从上向下执行）：
                            <el-button :icon="Plus" @click="addShellType(1)">添加{{ shellTypeEnum[1] }}</el-button>
                            <el-button :icon="Plus" @click="addShellType(2)">添加{{ shellTypeEnum[2] }}</el-button>
                            <el-button :icon="Plus" @click="addShellType(3)">添加{{ shellTypeEnum[3] }}</el-button>
                            <el-button type="primary" @click="showShell(state.currentRow)">查看格式化后的脚本</el-button>
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
                            <el-form-item v-for="(item, index) in base.baseScripts" :key="item.key"
                                :prop="`baseScripts.${num}.baseScripts.${index}.value`" :rules="scriptRules">
                                <el-select v-model="item.type" placeholder="脚本类型，默认为powershell" style="margin-bottom: 8px;"
                                    v-if="base.type === 2">
                                    <el-option label="powershell" value="powershell">powershell</el-option>
                                    <el-option label="bat" value="bat">bat</el-option>
                                    <el-option label="native" value="native">native</el-option>
                                </el-select>
                                <el-row class="row-content" :gutter="8">
                                    <el-col :span="20">
                                        <el-input type="textarea" :autosize="{ minRows: 2 }" v-model="item.value"
                                            style="word-break: break-all;"
                                            :placeholder="base.type === 1 ? '请输入远端脚本' : '请输入本地脚本,如果是powershell脚本，多行脚本使用英文分号 ; 分隔'"
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
                        </VueDraggable>
                        <el-row v-else :gutter="8">
                            <el-col :span="12">
                                <el-form-item label="本地文件或者文件夹路径" :rules="{ required: true, message: '请输入本地文件或者文件夹地址' }"
                                    :prop="`baseScripts.${num}.localFile`">
                                    <el-input v-model="base.localFile" placeholder="请输入本地文件或者文件夹地址" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="远端文件目录" :rules="{ required: true, message: '请输入远端文件目录' }"
                                    :prop="`baseScripts.${num}.remoteDir`">
                                    <el-input v-model="base.remoteDir" placeholder="请输入远端文件目录" clearable
                                        :spellcheck="false" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </el-card>
                </VueDraggable>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="state.showAdd = false">取消</el-button>
                    <el-button type="primary" @click="onConfim">确认</el-button>
                </span>
            </template>
        </el-dialog>
        <el-dialog v-model="state.shellShow" title="格式化脚本详情" width="1000px" draggable>
            <el-input readonly :model-value="state.shellStr" type="textarea" :rows="20" resize="none" />
        </el-dialog>
        <el-dialog v-model="state.showInset" title="内置详情" draggable>
            <div> NOW_TIME: 'YYYY-MM-DD~HH:mm:ss' // 脚本运行时的时间</div>
        </el-dialog>
    </base-page>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElForm, ElMessageBox } from 'element-plus';
import Table from '@/components/table.vue';
import { deleteItems, findAll, getDatabase } from '@/utils/database';
import { CirclePlusFilled, RemoveFilled, Sort, Plus, Search, Download, Delete } from '@element-plus/icons-vue';
import { VueDraggable } from 'vue-draggable-plus'
import { ServerListRecord } from '@/utils/tables';
import { exportData, formatScriptStr, noRepeat, shellTypeEnum } from '@/utils';
import dayjs from 'dayjs';
import { ShellListRecoed } from '@/utils/tables';
import { v4 } from 'uuid';

type ShellListRecoedType = Omit<ShellListRecoed, 'envVar'> & { envVar: string }
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
    } as ShellListRecoedType,
    showAdd: false,
    parseEnvVarOpt: [] as string[],
    shellShow: false,
    shellStr: '',
    selects: [] as ShellListRecoed[],
    showInset: false,
})
const validater = (rule: any, value: any, callback: any) => {
    try {
        JSON.parse(value); // 尝试解析 JSON
        callback(); // 解析成功，调用 callback() 表示验证通过
    } catch (error) {
        callback(new Error('解析错误，请填写 JSON 格式')); // 解析失败，调用 callback() 传递错误信息
    }
}
const rules = {
    scriptName: {
        required: true,
        message: '请输入配置文件名称'
    },
    envVar: [
        {
            required: true,
            message: '请输入脚本变量配置'
        },
        { validator: validater, trigger: 'blur' }

    ],
}

const scriptRules = {
    required: true,
    message: '脚本配置不能为空',
    trigger: 'blur',
}

const envVarPleaseHold = `请输入配置json
{
    "mainPath": "/data/Component/shujuzichanpingguchengshiduan/assetmain",
    "Harbor": "172.16.32.28:32080",
    "DeployIP": "172.16.32.28",
    "Namespace": "dataos",  
}
`
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
    param.envVar = JSON.stringify(envVar, null, '\t')
    state.parseEnvVarOpt = Object.keys(JSON.parse(param.envVar))
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
        ElMessage.error('请选择数据！');
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
    const param = {
        ...state.currentRow,
        uuid: state.currentRow.uuid ? state.currentRow.uuid : v4(),//添加唯一键
        baseScripts: JSON.parse(JSON.stringify(state.currentRow.baseScripts)),
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

function showShell(row: { envVar: string | Record<string, any>, baseScripts: ShellListRecoed['baseScripts'] }) {
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
    state.shellStr = formatScriptStr(env, row.baseScripts);
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
</style>