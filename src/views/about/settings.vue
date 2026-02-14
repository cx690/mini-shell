<template>
    <BasePage>
        <el-form :model="settings.config" label-width="auto">
            <el-card>
                <template #header>
                    {{ t('View-Settings') }}
                </template>
                <el-form-item :label="t('Language')" prop="locale">
                    <el-select v-model="settings.config.locale" :placeholder="t('pls-select')">
                        <el-option v-for="item of localeOptions" :label="item.name" :value="item.value"
                            :key="item.value" />
                    </el-select>
                    <el-button type="primary" @click="onLoadLanguage">{{ t('load-language-pkg') }}</el-button>
                    <el-tooltip placement="top">
                        <el-icon class="ml-8">
                            <QuestionFilled />
                        </el-icon>
                        <template #content>
                            <p>{{ t('load-language-pkg-tips') }}</p>
                        </template>
                    </el-tooltip>
                </el-form-item>
                <el-form-item :label="t('Default-pageSize')" prop="pageSize">
                    <el-select v-model="settings.config.pageSize" :placeholder="t('pls-select')">
                        <el-option v-for="item of pageSizes" :label="item" :value="item" :key="item" />
                    </el-select>
                </el-form-item>
            </el-card>
            <el-card>
                <template #header>
                    {{ t('Transfer-Settings-sftp') }}
                </template>
                <el-form-item :label="t('max-upload-tasks')" prop="maxTasks">
                    <el-select v-model="settings.config.maxTasks">
                        <el-option v-for="item in 5" :key="item" :value="item" :label="item" />
                    </el-select>
                    <el-tooltip placement="top">
                        <el-icon>
                            <el-text type="warning">
                                <QuestionFilled />
                            </el-text>
                        </el-icon>
                        <template #content>
                            <p>{{ t('max-warn-tip') }}</p>
                        </template>
                    </el-tooltip>
                </el-form-item>
                <el-form-item :label="t('Max-files-tasks')" prop="maxFiles">
                    <el-select v-model="settings.config.maxFiles">
                        <el-option v-for="item of maxFiles" :key="item" :value="item" :label="item" />
                    </el-select>
                    <el-tooltip placement="top">
                        <el-icon>
                            <el-text type="warning">
                                <QuestionFilled />
                            </el-text>
                        </el-icon>
                        <template #content>
                            <p>{{ t('max-warn-tip') }}</p>
                        </template>
                    </el-tooltip>
                </el-form-item>
                <el-form-item :label="t('Show-transfer-process')" prop="pageSize">
                    <el-switch v-model="settings.config.showUploadProcess" />
                </el-form-item>
            </el-card>

            <el-card>
                <template #header>
                    {{ t('Zmodem-drag-Settings') }}
                </template>
                <el-form-item :label="t('zmodem-cmd')" prop="zmodemCmd">
                    <el-input v-model="settings.config.zmodemCmd" :placeholder="t('zmodem-cmd-placeholder')" clearable
                        class="w-200" />
                </el-form-item>
            </el-card>
        </el-form>
    </BasePage>
</template>
<script setup lang="ts">
import useSettings, { pageSizes } from '@/store/useSetting';
import { useI18n } from 'vue-i18n';
import { QuestionFilled } from '@element-plus/icons-vue';
import { localeOptions } from '@/i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
const { t } = useI18n();
const settings = useSettings();
const maxFiles = [5, 10, 15, 20];

async function onLoadLanguage() {
    const res = await electronAPI.showOpenDialog({
        title: t('select-config-file'),
        properties: ['openFile'],
        filters: [{ extensions: ['json'], name: '' }]
    })
    if (!res.canceled) {
        console.log(res)
        const path = res.filePaths[0];
        if (!/\.json$/.test(path)) {
            ElMessage.error(t('select-error-json'));
            return;
        }
        try {
            const text = await electronAPI.readFile(path);
            JSON.parse(text);
            const sessionPath = await electronAPI.appGetPath('sessionData');
            await electronAPI.fsCopyFile2dir(path, sessionPath + '/locales');
            const action = await ElMessageBox.confirm(t('reload-app-locale-enable')).catch(action => action);
            if (action === 'confirm') {
                electronAPI.restartApp();
            }
        } catch (err) {
            ElMessage.error(err + '');
        }
    }
}
</script>
<style lang="less" scoped>
.el-card {
    margin-bottom: @gap*2;
}

.el-select {
    width: 200px;
    margin-right: @gap;
}

.w-200 {
    width: 200px;
}

.ml-8 {
    margin-left: 8px;
}
</style>
