<template>
    <el-result icon="error" title="404" :sub-title="$t('404-title')">
        <template #extra>
            <router-link to="/"><el-button type="primary">{{ $t('Back-main') }}</el-button></router-link>
        </template>
    </el-result>
</template>
