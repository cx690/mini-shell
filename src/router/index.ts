import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Desk from '@/layouts/desk.vue';
import { ElMessage } from 'element-plus';

/** meta类型说明 */
export interface MetaType {
    /** 菜单标题 */
    title?: string;
    /** 菜单标题i18n */
    t?: string;
    /** 是否隐藏菜单 默认false */
    hiddenNav?: boolean;
    /** 要激活的其他路由名称，一般详情里面激活对应列表，以此生成面包屑 */
    active?: string;
    /** 页面是否缓存，默认true */
    keepAlive?: boolean;
}
// name会用作菜单的key,且必须与path一致，根路径请加左/，请必填
export const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        redirect: '/desk/main',
        meta: {
            hiddenNav: true
        }
    },
    {
        path: '/desk',
        name: 'desk',
        redirect: '/desk/main',
        component: Desk,
        meta: {
            title: '交互桌面',
            t: 'route-desk',
        },
        children: [
            {
                path: 'main',
                name: 'main',
                component: () => import('@/views/main/main.vue'),
                meta: {
                    title: '服务列表',
                    t: 'route-main',
                    keepAlive: false,
                },
            },
            {
                path: 'excute',
                name: 'excute',
                component: () => import('@/views/main/excute.vue'),
                meta: {
                    title: '脚本执行',
                    t: 'route-excute',
                    keepAlive: true,
                },
            },
        ]
    },
    {
        path: '/config',
        name: 'config',
        redirect: '/config/server',
        component: Desk,
        meta: {
            title: '配置管理',
            t: 'route-config',
        },
        children: [
            {
                path: 'server',
                name: 'server',
                component: () => import('@/views/config/server.vue'),
                meta: {
                    title: '服务连接配置',
                    t: 'route-server',
                    keepAlive: false,
                },
            },
            {
                path: 'shellConfig',
                name: 'shellConfig',
                component: () => import('@/views/config/shellConfig.vue'),
                meta: {
                    title: '脚本配置管理',
                    t: 'route-shellConfig',
                    keepAlive: false,
                },
            },
            {
                path: 'ioConfig',
                name: 'ioConfig',
                component: () => import('@/views/config/ioConfig.vue'),
                meta: {
                    title: '导入导出数据',
                    t: 'route-ioConfig',
                },
            },
        ]
    },
    {
        path: '/about',
        name: 'about',
        component: Desk,
        meta: {
            title: '关于',
            t: 'route-about',
        },
        children: [
            {
                path: 'system',
                name: 'system',
                component: () => import('@/views/about/system.vue'),
                meta: {
                    title: '系统信息',
                    t: 'route-system',
                },
            },
            {
                path: 'license',
                name: 'license',
                component: () => import('@/views/about/license.vue'),
                meta: {
                    title: '开源协议',
                    t: 'route-license',
                },
            },
        ]
    },
    ...(process.env.NODE_ENV === 'development' ? [{
        path: '/external',
        name: 'external',
        redirect: '/external/vueorg',
        component: Desk,
        meta: {
            title: '开发文档',
        },
        children: [
            {
                path: 'vueorg',
                name: 'vueorg',
                component: () => import('@/views/external/vueorg.vue'),
                meta: {
                    title: 'Vue3文档'
                },
            },
            {
                path: 'viteorg',
                name: 'viteorg',
                component: () => import('@/views/external/viteorg.vue'),
                meta: {
                    title: 'Vite文档'
                },
            },
        ]
    }] : []),
    {
        path: '/404',
        name: '404',
        component: () => import('@/views/404.vue'),
        meta: {
            hiddenNav: true
        }
    },
]

export type MenuType = {
    meta?: MetaType;
    name: string;
    path: string;
    children?: MenuType[];
}

function getMenus(routes: RouteRecordRaw[]): MenuType[] {
    return routes.map(item => {
        const { meta, name, path } = item;
        if (typeof name !== 'string') {
            throw new TypeError('route name must be set!');
        }
        const menu: MenuType = {
            meta,
            name,
            path,
        }
        if (meta?.hiddenNav) return null;
        if (item.children?.length) {
            menu.children = getMenus(item.children)
        }
        return menu;
    }).filter(Boolean) as MenuType[];
}

export const menus = getMenus(routes);

const router = createRouter({
    history: createWebHashHistory(window.location.pathname),
    routes
})

router.beforeEach((to, from, next) => {
    if (!to.matched?.length) {
        if (from.name) {
            ElMessage.error(localStorage.locale === 'en' ? 'The page you want to go to does not exist' : '您要前往的页面不存在');
            next(from);
        } else {
            next('/404');
        }
        return;
    }
    next();
})

export default router;
