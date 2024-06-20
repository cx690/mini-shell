import { app, Menu, shell, BrowserWindow, dialog } from 'electron';
import getLocales, { lang, setLang, t } from './locales';

const isMac = process.platform === 'darwin';

async function getTemplate() {
    const template: any[] = [
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            }]
            : []),
        {
            label: t('menu.File') ?? '文件',
            submenu: [
                {
                    label: t('menu.settings') ?? '设置',
                    click: (MenuItem: any, win: BrowserWindow) => {
                        const url = new URL(win.webContents.getURL());
                        if (url.hash !== '#/about/settings') {
                            url.hash = '#/about/settings';
                            win.loadURL(url.href);
                        }
                    }
                },
                { role: isMac ? 'close' : 'quit', label: t('menu.quit') ?? '退出' }
            ]
        },
        {
            label: t('menu.Edit') ?? '编辑',
            submenu: [
                { role: 'undo', label: t('menu.undo') ?? '撤销' },
                { role: 'redo', label: t('menu.redo') ?? '重做' },
                { type: 'separator' },
                { role: 'cut', label: t('menu.cut') ?? '剪切' },
                { role: 'copy', label: t('menu.copy') ?? '复制' },
                { role: 'paste', label: t('menu.paste') ?? '粘贴' },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                        { type: 'separator' },
                        {
                            label: 'Speech',
                            submenu: [
                                { role: 'startSpeaking' },
                                { role: 'stopSpeaking' }
                            ]
                        }
                    ]
                    : [
                        { role: 'delete', label: t('menu.delete') ?? '删除' },
                        { type: 'separator' },
                        { role: 'selectAll', label: t('menu.selectAll') ?? '全选' }
                    ])
            ]
        },
        {
            label: t('menu.View') ?? '视图',
            submenu: [
                {
                    // role: 'reload', 
                    label: t('menu.reload') ?? '重新加载',
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
                { role: 'forceReload', label: t('menu.forceReload') ?? '强制重新加载' },
                { role: 'toggleDevTools', label: t('menu.toggleDevTools') ?? '开发者工具', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom', label: t('menu.resetZoom') ?? '重置缩放' },
                { role: 'zoomIn', label: t('menu.zoomIn') ?? '放大' },
                { role: 'zoomOut', label: t('menu.zoomOut') ?? '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: t('menu.togglefullscreen') ?? '进入/退出全屏' }
            ]
        },
        {
            label: t('menu.Window') ?? '窗口',
            submenu: [
                {
                    role: 'minimize',
                    label: t('menu.minimize') ?? '最小化',
                    accelerator: 'Ctrl+Shift+M',
                },
                {
                    label: t('menu.maxmize') ?? '最大化',
                    accelerator: 'Ctrl+Shift+Z',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.maximize();
                        }
                    }
                },
                {
                    label: t('menu.restore') ?? '恢复',
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
                        { role: 'front' },
                        { type: 'separator' },
                        { role: 'window' }
                    ]
                    : [
                        { role: 'close', label: t('menu.close') ?? '退出' }
                    ])
            ]
        },
        ...(process.env.NODE_ENV === 'development' ? [{
            role: 'help',
            label: t('menu.Help') ?? '帮助',
            submenu: [
                {
                    label: t('menu.LearnMore') ?? '学习更多',
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
