import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';

export const pageSizes = [10, 20, 30, 40, 50, 100] as const;

export type ConfigType = {
    pageSize: (typeof pageSizes)[number],
    showUploadProcess: boolean,
    dark: boolean,
}

const useSettings = defineStore('settings', () => {
    const config = reactive<ConfigType>({
        pageSize: 10,
        showUploadProcess: false,
        dark: false
    })

    window.addEventListener('storage', (e: WindowEventMap['storage']) => {
        const { key, oldValue, newValue } = e;
        if (key === 'config' && oldValue !== newValue) {
            initConfig();
        }
    })

    function initConfig() {
        let str = localStorage.getItem('config');
        if (str) {
            try {
                const data = JSON.parse(str) as ConfigType;
                config.pageSize = data.pageSize || 10;
                config.showUploadProcess = !!data.showUploadProcess;
                config.dark = !!data.dark;
            } catch (error) {
                localStorage.removeItem('config');
            }
        }
    }

    initConfig();
    watch(config, () => {
        localStorage.setItem('config', JSON.stringify(config));
        if (config.dark) {
            document.querySelector('html')!.classList.add('dark');
        } else {
            document.querySelector('html')!.classList.remove('dark');
        }
        electronAPI.changeThemeSource(config.dark ? 'dark' : 'light');
    })
    return {
        config,
    }
})

export default useSettings;
