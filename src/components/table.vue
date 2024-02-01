<template>
    <el-table v-bind="tableProps">
        <slot></slot>
    </el-table>
    <el-pagination v-if="props.data && props.data.length > 10" v-model:page-size="state.pageSize"
        v-model:current-page="state.currentPage" :total="props.data ? props.data.length : 0"
        layout="sizes, prev, pager, next, jumper, ->, total" />
</template>
 
<script setup lang="ts">
import { TableProps } from 'element-plus/es/components';
import { computed, reactive, useAttrs } from 'vue';

defineOptions({
    inheritAttrs: false,//取消默认透传，因为组件已经指明了透传
})
const state = reactive({
    pageSize: 10,
    currentPage: 1,
})

const attrs = useAttrs();
const props = defineProps<TableProps<any>>();

const data = computed(() => {
    const { data } = props;
    const { currentPage, pageSize } = state;
    if (data) {
        return data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    }
    return data;
})

const tableProps = computed(() => {
    return Object.assign({}, attrs, props, { data: data.value, fit: props.fit === false, showHeader: props.showHeader === false });//存在两个数据值不一致
})
</script>
