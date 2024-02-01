declare module '@vue/runtime-core' {
    export interface GlobalComponents {
        BasePage: typeof import('@/components/basePage.vue')['default']
    }
}

export { };