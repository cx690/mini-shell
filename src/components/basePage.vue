<template>
    <div :class="{ 'base-page': true, 'base-page-full': full }">
        <header v-if="$slots.form || $slots.extra" class="base-page-header">
            <div class="base-page-form">
                <slot name="form"></slot>
            </div>
            <div v-if="$slots.extra" class="base-page-extra">
                <slot name="extra"></slot>
            </div>
        </header>
        <div v-if="$slots.default" class="base-page-tableContainer">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    full?: boolean;
}>()
defineSlots<{
    /** 表单部分 */
    form: any;
    /** 右上方扩展按钮区域 */
    extra: any;
    /** 默认区域一般是表格部分 */
    default: any
}>()
</script>

<style scoped lang="less">
.base-page {
    box-sizing: border-box;
    padding: @gap 2*@gap 0 2*@gap;
    display: flex;
    flex-direction: column;

    .base-page-tableContainer {
        margin-top: @gap;
        width: 100%;

        th {
            background: #f5f7fa;
        }
    }

    .base-page-header {
        line-height: inherit;
        margin-top: @gap;
        display: flex;
        align-items: center;
        width: 100%;

        .base-page-form {
            flex: 1 1 100px;
        }

        .base-page-extra {
            margin-left: @gap;
        }
    }

    &.base-page-full {
        width: 100%;
        height: calc(100% - var(--layout-breadcrumb-header, 0));
        position: relative;

        .base-page-tableContainer {
            flex: 1 1 0;
            min-height: 0;
        }
    }
}
</style>