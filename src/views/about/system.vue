<template>
    <base-page>
        <div class="content">
            <div>软件版本: {{ version }}</div>
            <div>发布日期: {{ buildTime }}</div>
            <div>Chrome: {{ versions.chrome }}</div>
            <div>Node: {{ versions.node }}</div>
            <div>Electron: {{ versions.electron }}</div>
            <div class="developer">
                <div>开发者：</div>
                <div class="item" @click="openExternal(item.href)" v-for="(item, index) of developer" :key="index">
                    <img :src="item.img" />
                    <el-link>{{ item.name }}</el-link>
                </div>
            </div>
        </div>
    </base-page>
</template>
<script setup lang="ts">
const { versions, openExternal } = electronAPI;
const developer = [
    {
        name: 'cx690',
        href: 'https://github.com/cx690',
        img: 'https://avatars.githubusercontent.com/u/37604988?s=96&v=4'
    },
    {
        name: 'm414004152',
        href: 'https://github.com/m414004152',
        img: 'https://avatars.githubusercontent.com/u/68525965?v=4'
    }
]
const version = process.env.version;
const buildTime = process.env.buildTime;
</script>
<style lang="less" scoped>
.content {
    display: grid;
    gap: @gap*2;
    grid-template-columns: 1fr;
}

.developer {
    display: flex;
    gap: @gap*2;
    justify-content: flex-start;
    align-items: center;
    line-height: 32px;

    >.item {
        display: flex;
        gap: @gap*0.5;
        align-items: center;
        cursor: pointer;

        img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }
    }
}
</style>
