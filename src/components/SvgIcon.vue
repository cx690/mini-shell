<template>
    <svg aria-hidden="true" width="1em" height="1em" fill="currentColor">
        <use :href="`#icon-${name}`" fill="currentColor" />
    </svg>
</template>

<script lang="ts" setup>
defineProps<{
    /** 请填写src/assets/icons中svg的名称 */
    name: string;
}>()
</script>
<style lang="less" scoped></style>