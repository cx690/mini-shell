<template>
    <div class="layouts-desk">
        <el-container class="content">
            <el-header class="header-div">
                <div class="header">
                    <div>{{ t('title') }}</div>
                    <div class="extra">
                        <el-button v-if="win.close" @click="onCancelColose" :icon="Remove">{{ t('cancel_close_windows')
                        }}</el-button>
                        <el-dropdown @command="onChangeLocal">
                            <i class="el-icon el-tooltip__trigger" style="font-size: 24px;">
                                <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="1.2em" height="1.2em">
                                    <path fill="currentColor"
                                        d="m18.5 10l4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10h2zM10 2v2h6v2h-1.968a18.222 18.222 0 0 1-3.62 6.301a14.864 14.864 0 0 0 2.336 1.707l-.751 1.878A17.015 17.015 0 0 1 9 13.725a16.676 16.676 0 0 1-6.201 3.548l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18.078 18.078 0 0 1 4.767 8h2.24A16.032 16.032 0 0 0 9 10.877a16.165 16.165 0 0 0 2.91-4.876L2 6V4h6V2h2zm7.5 10.885L16.253 16h2.492L17.5 12.885z">
                                    </path>
                                </svg>
                            </i>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item command="zh-cn">中文</el-dropdown-item>
                                    <el-dropdown-item command="en">English</el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                        <el-button type="primary" @click="openWin" :icon="Plus">{{ t('new_window') }}</el-button>
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
                                        {{ item.meta?.t ? t(item.meta.t) : item.meta?.title }}
                                    </template>
                                    <el-menu-item v-for="subItem of item.children" :key="subItem.name"
                                        :index="subItem.name">
                                        <router-link :to="{ name: subItem.name }">
                                            {{ subItem.meta?.t ? t(subItem.meta.t) : subItem.meta?.title }}
                                        </router-link>
                                    </el-menu-item>
                                </el-sub-menu>
                            </template>
                            <el-menu-item :index="item.name" v-else>
                                <router-link :to="{ name: item.name }">
                                    {{ item.meta?.t ? t(item.meta.t) : item.meta?.title }}
                                </router-link>
                            </el-menu-item>
                        </template>
                    </el-menu>
                </el-aside>
                <el-main id="main">
                    <div class="layout-breadcrumb">
                        <el-breadcrumb separator=">">
                            <el-breadcrumb-item v-for="({ title, path, t: str }, index) of breadcrumbs" :key="path">
                                <template v-if="index === 0 || index === breadcrumbs.length - 1">
                                    {{ str ? t(str) : title }}
                                </template>
                                <router-link v-else :to="path">
                                    {{ str ? t(str) : title }}
                                </router-link>
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
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const breadcrumbs = computed(() => {
    const { path } = route;
    const breadcrumbs: { path: string, title: string, t?: string }[] = [];
    let paths = path.split('/').filter(Boolean);
    const routes = router.getRoutes();
    while (paths.length) {
        const name = paths.pop();
        const item = routes.find(item => item.name === name);
        if (item) {
            const meta = item.meta as MetaType;
            breadcrumbs.unshift({
                title: meta?.title || '',
                t: meta?.t,
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

const { t, locale } = useI18n();

function onChangeLocal(command?: string) {
    locale.value = command === 'en' ? 'en' : 'zh-cn';
    localStorage.locale = locale.value;
    electronAPI.switchLocale(locale.value);
}
onChangeLocal(localStorage.locale);
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

        .extra {
            display: flex;
            gap: 10px;
            align-items: center;
        }
    }
}
</style>