<template>
    <el-result icon="error" title="404" sub-title="对不起，您要查看的页面不存在！">
        <template #extra>
            <router-link to="/"><el-button type="primary">返回首页</el-button></router-link>
        </template>
    </el-result>
</template>
