import fs from 'fs/promises';
import { dialog } from "electron";
import path from 'path';
import { getAllFiles } from './utils';
const locales: { locale: string, message: any }[] = [];
export default async function getLocales(locale?: string) {
    if (!locales.length) {
        const files = await getAllFiles(path.resolve(__dirname, '../locales'));
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
