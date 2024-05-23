import { ElMessage } from "element-plus";
import { findAll } from "./database";
import { ShellListRecoed } from "./tables";

type PathItem = { name: string, value: string };
/** 检查是否存在循环引用的问题和脚本不存在问题 */
export async function checkLoop(shell: ShellListRecoed | ShellListRecoed<'edit'>, t: any, shellList?: ShellListRecoed[]) {
    if (!shellList) {
        shellList = await findAll<ShellListRecoed>('shellList');
    }
    const notFound: PathItem[][] = [];
    const circle: PathItem[][] = [];
    function checkComine(shell: ShellListRecoed | ShellListRecoed<'edit'>, parent: PathItem[] = []) {
        if (parent.length) {
            const find = parent.find(item => item.value === shell.uuid);
            if (find) {
                circle.push([...parent, { name: shell.scriptName, value: shell.uuid }]);
                return;
            }
        }
        const root = shell.baseScripts?.filter(item => item.type === 4);
        if (root?.length) {
            const children = filterWithKey(root.map(item => {
                if (item.combine?.length) {
                    return item.combine;
                }
                return [];
            }).flat(), 'value');
            for (const child of children) {
                const target = shellList!.find(item => item.uuid === child.value);
                if (!target) {
                    notFound.push([...parent, { name: shell.scriptName, value: shell.uuid }]);
                    return;
                } else {
                    checkComine(target, [...parent, { name: shell.scriptName, value: shell.uuid }]);
                }
            }
        }
    }
    checkComine(shell);
    let pass = true;
    if (notFound.length) {
        ElMessage.error({
            message: t('not-found-combine-script', {
                path: formatPath(notFound)
            }),
            duration: 1e4
        })
        pass = false;
    }
    if (circle.length) {
        ElMessage.error({
            message: t('Circular-dependency', {
                path: formatPath(circle)
            }),
            duration: 1e4
        })
        pass = false;
    }
    return pass;
}

export function formatPath(arr: PathItem[][]) {
    return arr.map(paths => paths.map(item => item.name).join(' -> ')).join('; ');
}
function filterWithKey<T extends Record<string, any>, S extends keyof T>(arr: T[], key: S) {
    const list: T[] = [];
    for (const item of arr) {
        if (!list.find((target => target[key] === item[key]))) {
            list.push(item);
        }
    }
    return list;
}
