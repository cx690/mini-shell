import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
const allLocales = import.meta.glob(['/node_modules/element-plus/es/locale/lang/*.mjs', '!/node_modules/element-plus/es/locale/lang/zh-cn.mjs']);
const allDayjsLocales = import.meta.glob(['/node_modules/dayjs/locale/*.js', '!/node_modules/dayjs/locale/zh-cn.js']);

export const pageSizes = [10, 20, 30, 40, 50, 100] as const;

export type ConfigType = {
    /** 默认分页大小 */
    pageSize: (typeof pageSizes)[number],
    /** 上传脚本显示进度 */
    showUploadProcess: boolean,
    /** 是否黑暗模式 */
    dark: boolean,
    locale: string,
}

const useSettings = defineStore('settings', () => {
    const config = reactive<ConfigType>({
        pageSize: 10,
        showUploadProcess: false,
        dark: false,
        locale: 'zh-cn',
    })
    const ElLocale = ref(zhCn);
    const { locale } = useI18n();

    initConfig();
    function initConfig() {
        let str = localStorage.getItem('config');
        if (str) {
            try {
                const data = JSON.parse(str) as ConfigType;
                config.pageSize = data.pageSize || 10;
                config.showUploadProcess = !!data.showUploadProcess;
                if (config.dark !== data.dark) {
                    config.dark = !!data.dark;
                    setTheme();
                }
                if (config.locale !== data.locale) {
                    config.locale = data.locale || 'zh-cn';
                    loadLocale();
                }

            } catch (error) {
                localStorage.removeItem('config');
            }
        }
    }

    window.addEventListener('storage', (e: WindowEventMap['storage']) => {//监听器不会触发当前窗口的存储事件
        const { key, oldValue, newValue } = e;
        if (key === 'config' && oldValue !== newValue) {
            initConfig();
        }
    })

    watch(() => config.dark, () => {
        setTheme();
    });

    watch(() => config.locale, () => {
        loadLocale();
    });

    watch(config, () => {
        localStorage.setItem('config', JSON.stringify(config));
    });

    function setTheme() {
        if (config.dark) {
            document.querySelector('html')!.classList.add('dark');
        } else {
            document.querySelector('html')!.classList.remove('dark');
        }
        electronAPI.changeThemeSource(config.dark ? 'dark' : 'light');
    }

    function loadLocale() {
        const file = config.locale
        locale.value = config.locale;
        electronAPI.switchLocale(locale.value);
        if (file === 'zh-cn') {
            ElLocale.value = zhCn;
            return;
        };
        const key = `/node_modules/element-plus/es/locale/lang/${file}.mjs`;
        if (key in allLocales) {
            allLocales[key]().then((res: any) => {//加载对应i18n设置
                ElLocale.value = res.default;
            })
        } else {
            ElMessageBox.alert(`Can't find lang '${file}' in element-plus, please make the file name the same to be supported. See https://element-plus.org/en-US/guide/i18n.html#cdn-usage `);
        }

        const dayjsKey = `/node_modules/dayjs/locale/${file}.js`;
        if (dayjsKey in allDayjsLocales) {
            allDayjsLocales[dayjsKey]();//加载dayjs时间设置
        }
    }
    return {
        config,
        ElLocale,
    }
})

export default useSettings;
