<template>
    <el-table v-bind="tableProps" ref="table">
        <slot></slot>
    </el-table>
    <el-pagination v-if="props.data && props.data.length > 10" v-model:page-size="state.pageSize"
        v-model:current-page="state.currentPage" :total="props.data ? props.data.length : 0"
        layout="sizes, prev, pager, next, jumper, ->, total" />
</template>

<script setup lang="ts">
import useSettings from '@/store/useSetting';
import type { TableProps } from 'element-plus/es/components';
import { computed, reactive, ref, useAttrs } from 'vue';
const settings = useSettings();

defineOptions({
    inheritAttrs: false,//取消默认透传，因为组件已经指明了透传
})
const state = reactive({
    pageSize: settings.config.pageSize,
    currentPage: 1,
})

const attrs = useAttrs();
const props = defineProps<TableProps<any>>();
const table = ref<any>();
defineExpose({ table, resetPage() { state.currentPage = 1; } });

const tableProps = computed(() => {
    let data: any[];
    const { data: source } = props;
    const { pageSize } = state;
    let { currentPage } = state;
    if (currentPage !== 1 && pageSize) {
        const max = source?.length || 0;
        const maxPage = Math.ceil(max / pageSize);
        if (currentPage > maxPage) {
            currentPage = maxPage;
        }
    }
    if (source) {
        data = source.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    } else {
        data = source;
    }
    return Object.assign({}, attrs, props, { data, fit: props.fit === false, showHeader: props.showHeader === false });//存在两个数据值不一致
})
</script>
