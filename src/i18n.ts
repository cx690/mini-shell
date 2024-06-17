import { createI18n } from "vue-i18n";

const i18n = createI18n({
    locale: localStorage.locale ?? 'zh-cn',
    legacy: false,
    fallbackLocale: 'zh-cn',
})

export const localeOptions: { value: string, name: string }[] = [];

export async function loadLocales() {
    let locales: {
        locale: string;
        message: Record<string, any>;
    }[] = [];
    if (process.env.NODE_ENV !== 'production') {//开发模式下 直接加载能够正常热更新
        const source = import.meta.glob('../locales/*.json');
        for (const key in source) {
            const res: any = await source[key]();
            const regex = /([^/]+)\.json$/;
            const match = regex.exec(key);
            const locale = match?.[1];
            locale && locales.push({ locale, message: res.default });
        }
    } else {
        locales = await electronAPI.getLocales();
    }
    for (const { locale, message } of locales) {
        localeOptions.push({ value: locale, name: message?.locale_name ?? locale });
        i18n.global.setLocaleMessage(locale, message);
    }
}

export const t = i18n.global.t;
export default i18n;
