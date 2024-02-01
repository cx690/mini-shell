<template>
    <base-page>
        <template #form>
            <el-form inline>
                <el-form-item label='关键字'>
                    <el-input v-model:value="state.formData.kw" placeholder="请输入关键字" />
                </el-form-item>

                <el-form-item>
                    <el-button @Click="onSearch">查询</el-button>
                </el-form-item>
            </el-form>
        </template>
        <template #extra>
            <el-button type="primary">新增</el-button>
        </template>

        <el-table :data="state.data">
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="age" label="年龄" />
            <el-table-column prop="address" label="住址" />
            <el-table-column prop="action" label="操作">
                <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="showDetail(row)">详情</el-link>
                    <el-link type="primary" :underline="false" @click="showDetail(row)">详情</el-link>
                </template>
            </el-table-column>
        </el-table>
    </base-page>
</template>
<script setup lang="ts">
import { onMounted, reactive } from 'vue';

defineOptions({
    name: 'demo'
})

const state = reactive({
    data: [] as any[],
    total: 0,
    formData: {
        kw: '',
        page: 1,
        pageSize: 10,
    }
})

onMounted(onSearch);

function onSearch() {
    state.formData.page = 1;
    getTableData();
}
// function onChange(page: number, pageSize: number) {
//     state.formData.page = page;
//     state.formData.pageSize = pageSize;
//     getTableData();
// }
async function getTableData() {
    const { code, data } = await new Promise<any>((resolve) => {
        setTimeout(() => {
            resolve({
                code: 200,
                data: {
                    list: Array.from({ length: 55 }).map((item, index) => ({
                        id: index + '',
                        name: '胡彦斌',
                        age: 18 + index,
                        address: `西湖区湖底公园${index}号`,
                    })),
                    //  [{
                    //     id: '1',
                    //     name: '胡彦斌',
                    //     age: 32,
                    //     address: '西湖区湖底公园1号',
                    // },
                    // {
                    //     id: '2',
                    //     name: '胡彦祖',
                    //     age: 42,
                    //     address: '西湖区湖底公园1号',
                    // }],
                    total: 2,
                },
            })
        }, 2000)
    });
    if (code === 200) {
        state.data = data?.list || [];
        state.total = data?.total;
    }
}

function showDetail(row: any) {
    console.log(row);
}
</script>
<style lang="less" scoped ></style>