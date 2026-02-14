import fs from 'fs/promises';
import { dialog } from "electron";
import path from 'path';
import { getAllFiles } from '../common/utils';
import { langDir } from './config';

const locales: { locale: string, message: any }[] = [];
export let lang: string | undefined = 'zh-cn';
export function setLang(next?: string) {
    lang = next || 'zh-cn';
}

export function t(key: string) {
    let find = locales.find(item => item.locale === lang);
    if (!find) {
        find = locales.find(item => item.locale === 'zh-cn');
    }
    return find ? find.message[key] : key;
}

export default async function getLocales(locale?: string) {
    if (!locales.length) {
        const files = await getAllFiles(path.resolve(__dirname, '../locales'));
        if (langDir) {
            files.push(...await getAllFiles(langDir, /^(?!.*\.json$).*$/));
        }
        for (const { name, id } of files) {
            if (/\.json$/.test(id)) {
                let message: any = await fs.readFile(id, 'utf-8').catch((err) => {
                    dialog.showErrorBox('Locales read error!', err + '');
                    return "{}";
                });
                try {
                    message = JSON.parse(message);
                } catch (err) {
                    dialog.showErrorBox('Locales parse error!', err + '');
                }
                locales.push({ locale: name, message });
            }
        }
    }
    if (locale) {
        const find = locales.find(item => item.locale === locale);
        if (find) {
            return [find];
        } else {
            return [{ locale: locale, message: {} }];
        }
    }
    return locales;
}
