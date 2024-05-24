<template>
    <BasePage>
        <el-card>
            <template #header>
                {{ t('View-Settings') }}
            </template>
            <el-form :model="settings.config" label-width="200px">
                <el-form-item :label="t('Default-pageSize')" prop="pageSize">
                    <el-select v-model="settings.config.pageSize" :placeholder="t('pls-select')" clearable
                        style="width: 300px;">
                        <el-option v-for="item of pageSizes" :label="item" :value="item" :key="item" />
                    </el-select>
                </el-form-item>

                <el-form-item :label="t('Show-upload-process')" prop="pageSize">
                    <el-switch v-model="settings.config.showUploadProcess" />
                </el-form-item>
            </el-form>
        </el-card>
    </BasePage>
</template>
<script setup lang="ts">
import useSettings, { pageSizes } from '@/store/useSetting';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const settings = useSettings();

</script>