import { createI18n } from "vue-i18n";
import en from '@/locales/en.json';
import zh_cn from '@/locales/zh-cn.json';

const i18n = createI18n({
    locale: localStorage.locale === 'en' ? 'en' : 'zh-cn',
    legacy: false,
    fallbackLocale: 'zh-cn',
    messages: {
        'en': en,
        'zh-cn': zh_cn
    }
})

export default i18n;
