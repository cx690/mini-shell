import { app, Menu, shell, BrowserWindow, dialog } from 'electron';
import getLocales, { lang, setLang, t } from './locales';

const isMac = process.platform === 'darwin';

async function getTemplate() {
    const template: any[] = [
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { label: t('route-about'), click:  (MenuItem: any, win: BrowserWindow) => {
                        const url = new URL(win.webContents.getURL());
                        if (url.hash !== '#/about/system') {
                                url.hash = '#/about/system';
                                win.loadURL(url.href);
                            }
                        }      
                    },
                    { type: 'separator' },
                    { role: 'services', label: t('menu.services') },
                    { type: 'separator' },
                    { role: 'hide', label: t('menu.hide') },
                    { role: 'hideOthers', label: t('menu.hideOthers') },
                    { role: 'unhide', label: t('menu.unhide') },
                    { type: 'separator' },
                    { role: 'quit', label: t('menu.quit') }
                ]
            }]
            : []),
        {
            label: t('menu.File'),
            submenu: [
                {
                    label: t('menu.settings'),
                    click: (MenuItem: any, win: BrowserWindow) => {
                        const url = new URL(win.webContents.getURL());
                        if (url.hash !== '#/about/settings') {
                            url.hash = '#/about/settings';
                            win.loadURL(url.href);
                        }
                    }
                },
                { role: isMac ? 'close' : 'quit', label: t('menu.quit') }
            ]
        },
        {
            label: t('menu.Edit'),
            submenu: [
                { role: 'undo', label: t('menu.undo') },
                { role: 'redo', label: t('menu.redo') },
                { type: 'separator' },
                { role: 'cut', label: t('menu.cut') },
                { role: 'copy', label: t('menu.copy') },
                { role: 'paste', label: t('menu.paste') },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete', label: t('Delete') },
                        { role: 'selectAll', label: t('menu.selectAll') },
                        { type: 'separator' },
                        {
                            label: t('menu.speech'),
                            submenu: [
                                { role: 'startSpeaking', label: t('menu.startSpeaking') },
                                { role: 'stopSpeaking', label: t('menu.stopSpeaking') }
                            ]
                        }
                    ]
                    : [
                        { role: 'delete', label: t('menu.delete') },
                        { type: 'separator' },
                        { role: 'selectAll', label: t('menu.selectAll') }
                    ])
            ]
        },
        {
            label: t('menu.View'),
            submenu: [
                {
                    // role: 'reload',
                    accelerator: 'Ctrl+R',
                    label: t('menu.reload'),
                    click: async (item: any, win: BrowserWindow) => {
                        //任务判断
                        const taskNum = await win.webContents.executeJavaScript('window.Excute.getTaskNum();');
                        if (taskNum === 0) {
                            win.reload();
                        } else {
                            const { response } = await dialog.showMessageBox({
                                type: 'warning',
                                message: t('has-task-close-window'),
                                buttons: [t('Cancel'), t('Confirm')],
                                defaultId: 0,
                                cancelId: 0,
                            })
                            if (response === 1) {
                                win.reload();
                            }
                        }
                    }
                },
                { role: 'forceReload', label: t('menu.forceReload') },
                { role: 'toggleDevTools', label: t('menu.toggleDevTools'), accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom', label: t('menu.resetZoom') },
                { role: 'zoomIn', label: t('menu.zoomIn') },
                { role: 'zoomOut', label: t('menu.zoomOut') },
                { type: 'separator' },
                { role: 'togglefullscreen', label: t('menu.togglefullscreen') }
            ]
        },
        {
            label: t('menu.Window'),
            submenu: [
                {
                    role: 'minimize',
                    label: t('menu.minimize'),
                    accelerator: 'Ctrl+Shift+M',
                },
                {
                    label: t('menu.maxmize'),
                    accelerator: 'Ctrl+Shift+Z',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.maximize();
                        }
                    }
                },
                {
                    label: t('menu.restore'),
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.restore();
                        }
                    }
                },
                ...(isMac
                    ? [
                        { type: 'separator' },
                        { role: 'front', label: t('menu.front') },
                        { type: 'separator' },
                        { role: 'window', label: t('menu.window') }
                    ]
                    : [
                        { role: 'close', label: t('menu.close') }
                    ])
            ]
        },
        ...(import.meta.env.DEV ? [{
            role: 'help',
            label: t('menu.Help'),
            submenu: [
                {
                    label: t('menu.LearnMore'),
                    click: async () => {
                        await shell.openExternal('https://electronjs.org');
                    }
                }
            ]
        }] : [])
    ]

    return template;
}

export async function setApplicationMenu(locale?: string) {
    if (locale === lang) return;
    setLang(locale);
    await getLocales();
    const menu = Menu.buildFromTemplate(await getTemplate());
    Menu.setApplicationMenu(menu);
}

setApplicationMenu();//cjs 模式
