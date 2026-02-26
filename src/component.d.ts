declare module 'vue' {
    export interface GlobalComponents {
        BasePage: typeof import('@/components/BasePage.vue')['default']
        SvgIcon: typeof import('@/components/SvgIcon.vue')['default']
    }
}

export { };