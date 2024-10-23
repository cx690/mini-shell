<template>
    <base-page>
        <div class="content">
            <div>{{ $t('version') }}:&nbsp;
                <el-badge v-if="update.shouldUpdate === '1'"
                    :value="update.updateInfo?.updateInfo?.version ? `New v${update.updateInfo.updateInfo.version}` : 'New'"
                    :offset="[0, -10]">
                    <el-text type="primary" class="version" @click="check">v{{ version }}</el-text>
                </el-badge>
                <el-text type="primary" v-else class="version" @click="check">v{{ version }}</el-text>
                <el-button type="primary" size="small" style="margin-left: 10px" v-if="update.checking" loading
                    circle />
            </div>
            <div class="download" v-if="update.download">
                <el-text type="primary" v-if="update.download === 1">
                    {{ t('isDownload') }}：
                </el-text>
                <el-button v-if="update.download === 2" type="primary" @click="restart">
                    {{ t('quit-and-install') }}
                </el-button>
                <el-progress v-if="update.download === 1" style="width: 300px;"
                    :percentage="update.progressInfo?.percent || 0" :format="format" />
            </div>
            <div>{{ $t('buildTime') }}:&nbsp;{{ buildTime }}</div>
            <div>Chrome:&nbsp;{{ versions.chrome }}</div>
            <div>Node:&nbsp;{{ versions.node }}</div>
            <div>Electron:&nbsp;{{ versions.electron }}</div>
            <div class="developer">
                <div>{{ $t('developer') }}:&nbsp;</div>
                <div class="item" @click="openExternal(item.href)" v-for="(item, index) of developer" :key="index">
                    <img :src="item.img" />
                    <el-link>{{ item.name }}</el-link>
                </div>
            </div>
        </div>
    </base-page>
</template>
<script setup lang="ts">
import useUpdate from '@/store/useUpdate';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
const buildTime = new Date(process.env.buildTime).toLocaleString();
const update = useUpdate();

async function check() {
    await update.checkForUpdates(true, true);
}

function format() {
    const { progressInfo } = update;
    if (progressInfo) {
        const { percent, bytesPerSecond } = progressInfo;
        return `${percent.toFixed(1)}%  ${bytesPerSecond > 1024 ? (Math.floor(bytesPerSecond / 1024) + 'KB/S') : (bytesPerSecond + 'B/S')}`;
    }
    return '';
}

function restart() {
    window.electronAPI.quitAndInstall();
}
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

.version {
    cursor: pointer;
}

.download {
    display: flex;
    justify-content: flex-start;
}
</style>
