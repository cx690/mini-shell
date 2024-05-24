import type { SaveDialogOptions } from "electron";
import { ElMessage } from "element-plus";
import { exportData } from ".";
import { v4 } from "uuid";
export const AllStore = ['serverList', 'shellList', 'excuteList'] as const;
export type AllStoreType = typeof AllStore[number];
export function getDatabase() {
    const request = window.indexedDB.open("MyDatabase", 3);
    return new Promise<typeof request.result>((resolve, reject) => {
        request.onupgradeneeded = () => {
            const db = request.result;
            //会话表
            createStore(db, 'serverList', ['name', 'host', 'port', 'username', 'password', 'desc', 'uuid', 'aa']);
            //脚本表
            createStore(db, 'shellList', ['scriptName', 'host', 'envVar', 'localDir', 'mainPath', 'baseScripts', 'group', 'uuid', 'hidden']);
            //执行记录表
            createStore(db, 'excuteList', ['shellName', 'host', 'startTime', 'endTime', 'excuteId', 'excuteGroup', 'excuteType', 'status', 'logs', 'uuid', 'children']);
        }
        request.onsuccess = function () {
            resolve(request.result);
        }
        request.onerror = function (err) {
            reject(err);
        }
    })
}

export async function findAll<T = any>(store: AllStoreType) {
    return new Promise<T[]>(async (resolve) => {
        const data = [] as T[];
        const db = await getDatabase();
        db.transaction([store]).objectStore(store).openCursor().onsuccess = (event: any) => {
            const cursor = event.target.result;
            if (cursor) {
                data.unshift(cursor.value);
                cursor.continue();
            } else {
                resolve(data);
            }
        }
    })
}

/** 清空某个表的数据 */
export async function clearStore(store: AllStoreType) {
    return new Promise<void>(async (resolve) => {
        const db = await getDatabase();
        const table = db.transaction([store], 'readwrite').objectStore(store);
        const request = table.clear();
        request.onsuccess = () => {
            ElMessage.success(localStorage.locale === 'en' ? 'Deleted success!' : '已成功删除数据！');
            resolve();
        }
        request.onerror = function (err: any) {
            ElMessage.error(err + '');
            resolve();
        }
    })
}

/** 新增或者修改数据 */
export async function addOrPut(option: { db?: IDBDatabase, type: 'put' | 'add', record: Record<string, any>, storeName: AllStoreType }) {
    const { resolve, reject, promise } = Promise.withResolvers<void>();
    const { storeName, record, type } = option;
    let { db } = option;
    if (!db) {
        db = await getDatabase();
    }
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    try {
        const tagrget = Object.assign({}, record);
        if (!tagrget.uuid) {
            tagrget.uuid = v4();
        }
        if (type === 'add') {
            delete tagrget.id;
        }
        const action = objectStore[type](tagrget);
        action.onsuccess = () => {
            resolve();
        }
        action.onerror = (err) => {
            reject(err);
        }
    } catch (err) {
        reject(err);
    }
    return await promise;
}

export async function exportTables(t?: ReturnType<typeof import('vue-i18n').useI18n>['t'], option?: SaveDialogOptions, tabls?: string[]) {
    const text = await new Promise<string>((resolve, reject) => {
        const request = window.indexedDB.open("MyDatabase", 3);
        request.onsuccess = async (event: any) => {
            const db = event.target.result;
            const objectStoreNames = tabls?.length ? tabls : db?.objectStoreNames;
            const dataObj: any = {}
            for (let i = 0; i < objectStoreNames?.length; i++) {
                const storeName = objectStoreNames[i];
                const res = await findAll(storeName);
                const resWithoutId = res.map((item: any) => {
                    const { id, ...rest } = item;/* eslint-disable-line */
                    return rest;
                });
                dataObj[storeName] = resWithoutId
            }
            resolve(JSON.stringify(dataObj, null, 5));
        }
        request.onerror = (err) => {
            ElMessage.error(err + '');
            reject(err);
        }
    });
    return await exportData(text, option, t);
}

function createStore(db: IDBDatabase, storeName: string, index: string[]) {
    const objectStoreNames = db?.objectStoreNames;
    let store = !objectStoreNames.contains(storeName) && db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
    store && createIndex(store, index);
}

function createIndex(store: IDBObjectStore, index: string[]) {
    for (const name of index) {
        store.createIndex(name, name, { unique: false });
    }
}

/** 删除多条数据 */
export async function deleteItems(store: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
    if (!query) {
        ElMessage.error(localStorage.locale === 'en' ? 'No data found' : '没有找到要删除的数据');
        return;
    }

    if (typeof query === 'object' && !Array.isArray(query)) {
        return new Promise<Event>((resolve, reject) => {
            const request = store.delete(query);
            request.onsuccess = e => {
                ElMessage.success(localStorage.locale === 'en' ? 'Successful operation' : '操作成功');
                resolve(e);
            };
            request.onerror = err => {
                ElMessage.error(err + '');
                reject(err);
            }
        })
    } else {
        if (!Array.isArray(query)) {
            query = [query];
        }
        if (!query.length) {
            ElMessage.error(localStorage.locale === 'en' ? 'No data found' : '没有找到要删除的数据');
            return;
        }
        return Promise.all(query.map(item => {
            return new Promise<Event>((resolve, reject) => {
                const request = store.delete(item);
                request.onsuccess = e => {
                    resolve(e);
                };
                request.onerror = err => {
                    ElMessage.warning(err + '');
                    reject(err);
                }
            })
        })).then(res => {
            ElMessage.success(localStorage.locale === 'en' ? 'Successful operation' : '操作成功');
            return res;
        }).catch(err => {
            ElMessage.error(err + '');
            throw err;
        })
    }
}

export async function deleteItemsById(store: AllStoreType, id: number | number[]) {
    const db = await getDatabase();
    await deleteItems(db.transaction([store], 'readwrite').objectStore(store), id);
}
