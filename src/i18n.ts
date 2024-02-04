import { createI18n } from "vue-i18n";
import en from '@/locales/en.json';
import zh_cn from '@/locales/zh-cn.json';

const i18n = createI18n({
    locale: localStorage.locale === 'zh-cn' ? 'zh-cn' : 'en',
    legacy: false,
    fallbackLocale: 'en',
    messages: {
        'en': en,
        'zh-cn': zh_cn
    }
})

export default i18n;
