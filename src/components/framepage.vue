<template>
    <iframe :key="src" class="iframe" title="外部链接！" :src="src" frameborder="0" v-if="src" width="100%" height="100%"></iframe>
</template>
<script lang="ts" setup>
defineProps<{ src: string }>();
</script>
<style lang="less" scoped>
.iframe {
    width: 100%;
    height: calc(100% - var(--layout-breadcrumb-header, 50px) - 5px);
    overflow: hidden;
}
</style>