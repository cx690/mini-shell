<template>
    <div class="layouts-desk">
        <el-container class="content">
            <el-header class="header-div">
                <div class="header">
                    <div>迷你Shell</div>
                    <div>
                        <el-button v-if="win.close" @click="onCancelColose" :icon="Remove">取消任务执行完毕关机设定</el-button>
                        <el-button type="primary" @click="openWin" :icon="Plus">新开窗口</el-button>
                    </div>
                </div>
            </el-header>
            <el-container class="body-content">
                <el-aside width="200px">
                    <el-menu :default-active="((route.meta.active || route.name) as string)"
                        :default-openeds="['desk', 'config', 'about']" class="aside-menu">
                        <template v-for="item of menus">
                            <template v-if="item.children?.length">
                                <el-sub-menu :index="item.name">
                                    <template #title>
                                        {{ item.meta?.title }}
                                    </template>
                                    <el-menu-item v-for="subItem of item.children" :key="subItem.name"
                                        :index="subItem.name">
                                        <router-link :to="{ name: subItem.name }">{{ subItem.meta?.title }}</router-link>
                                    </el-menu-item>
                                </el-sub-menu>
                            </template>
                            <el-menu-item :index="item.name" v-else>
                                <router-link :to="{ name: item.name }">{{ item.meta?.title }}</router-link>
                            </el-menu-item>
                        </template>
                    </el-menu>
                </el-aside>
                <el-main id="main">
                    <div class="layout-breadcrumb">
                        <el-breadcrumb separator=">">
                            <el-breadcrumb-item v-for="({ title, path }, index) of breadcrumbs" :key="path">
                                <template v-if="index === 0 || index === breadcrumbs.length - 1">{{ title }}</template>
                                <router-link v-else :to="path">{{ title }}</router-link>
                            </el-breadcrumb-item>
                        </el-breadcrumb>
                    </div>
                    <router-view v-slot="{ Component, route }">
                        <transition name="fade-slide" mode="out-in" appear>
                            <keep-alive :include="keepliveList">
                                <component :is="Component" :key="route.fullPath" />
                            </keep-alive>
                        </transition>
                    </router-view>
                    <el-backtop :right="100" :bottom="100" target="#main" />
                </el-main>
            </el-container>
        </el-container>
    </div>
</template>
<script setup lang="ts">
import { menus, MetaType } from '@/router';
import { useRoute, useRouter } from 'vue-router';
import { RouterLink, RouterView } from 'vue-router';
import { computed } from 'vue';
import { Remove, Plus } from '@element-plus/icons-vue';
import useWin from '@/store/useWin';

const route = useRoute();
const router = useRouter();
const breadcrumbs = computed(() => {
    const { path } = route;
    const breadcrumbs: { path: string, title: string }[] = [];
    let paths = path.split('/').filter(Boolean);
    const routes = router.getRoutes();
    while (paths.length) {
        const name = paths.pop();
        const item = routes.find(item => item.name === name);
        if (item) {
            const meta = item.meta as MetaType;
            breadcrumbs.unshift({
                title: meta?.title || '',
                path: item.path,
            })
            if (meta.active) {
                const active = routes.find(item => item.name === meta.active);
                if (active) {
                    paths = active.path.split('/').filter(Boolean);
                }
            }
        }
    }
    return breadcrumbs;
})

/** 计算所有缓存的路由名称 */
const keepliveList = computed(() => {
    return router.getRoutes().map(route => route.meta?.keepAlive !== false ? route.name : null).filter(Boolean) as string[];
})
function openWin() {
    electronAPI.open(window.location.href);
}
const win = useWin();
electronAPI.onInfo('close-windows', ({ data }) => {
    win.close = data;
})

function onCancelColose() {
    electronAPI.setCloseWhenTask0(false);
}
</script>

<style scoped lang="less">
.layouts-desk {
    width: 100%;
    height: 100%;
    min-height: 600px;
    background: #f5f5f5;
    --layout-breadcrumb-header: 50px;

    :deep(>.content) {
        width: 100%;
        height: 100%;

        .el-main {
            background: #fff;
            padding: 0;
            margin: @gap;
        }

        .el-aside,
        .el-header {
            background: #fff;
        }

        .aside-menu .el-menu-item {
            padding-left: 0 !important;
            padding-right: 0 !important;

            a {
                display: inline-block;
                padding-left: calc(var(--el-menu-base-level-padding) + var(--el-menu-level) * var(--el-menu-level-padding));
                width: 100%;
                color: inherit;
            }
        }

        .body-content {
            height: 500px;
        }
    }

    .layout-breadcrumb {
        background: #fff;
        height: var(--layout-breadcrumb-header);
        display: flex;
        align-items: center;
        margin-left: @gap*2;
    }

    .header-div {
        max-width: 100vw;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        height: 100%;
    }
}
</style>