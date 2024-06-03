import { createI18n } from "vue-i18n";
const locales = import.meta.glob('./locales/*.json');

const i18n = createI18n({
    locale: localStorage.locale ?? 'zh-cn',
    legacy: false,
    fallbackLocale: 'zh-cn',
})

export const localeOptions: { value: string, name: string }[] = [];

export async function loadLocales() {
    for (const key in locales) {
        const res: any = await locales[key]()
        const regex = /([^/]+)\.json$/;
        const match = regex.exec(key);
        const locale = match?.[1];
        if (locale) {
            localeOptions.push({ value: locale, name: res.default?.__locale_name ?? locale })
            i18n.global.setLocaleMessage(locale, res.default);
        }
    }
}

export const t = i18n.global.t;
export default i18n;
