<template>
    <el-button v-if="status === 1" type="success" size="small" :icon="Select" circle />
    <el-button v-if="status === 0" type="primary" size="small" loading circle />
    <el-button v-if="status === 2" type="danger" size="small" :icon="CloseBold" circle />
    <el-button v-if="status === 3 || status === 4" :loading="status === 3" type="info" size="small" :icon="CloseBold"
        circle />
</template>
<script setup lang="ts">
import type { ExcuteListRecoed } from '@/utils/tables';
import { Select, CloseBold } from '@element-plus/icons-vue';

defineProps<{
    status: ExcuteListRecoed['status']
}>()

</script>
