import { app, Menu, shell, BrowserWindow } from 'electron';
import getLocales from './locales';

const isMac = process.platform === 'darwin';

async function getTemplate(locale: string) {
    const { message = {} } = (await getLocales(locale))[0] || {};
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
            label: message['menu.File'] ?? '文件',
            submenu: [
                {
                    label: message['menu.settings'] ?? '设置',
                    click: (MenuItem: any, win: BrowserWindow) => {
                        const url = new URL(win.webContents.getURL());
                        if (url.hash !== '#/about/settings') {
                            url.hash = '#/about/settings';
                            win.loadURL(url.href);
                        }
                    }
                },
                { role: isMac ? 'close' : 'quit', label: message['menu.quit'] ?? '退出' }
            ]
        },
        {
            label: message['menu.Edit'] ?? '编辑',
            submenu: [
                { role: 'undo', label: message['menu.undo'] ?? '撤销' },
                { role: 'redo', label: message['menu.redo'] ?? '重做' },
                { type: 'separator' },
                { role: 'cut', label: message['menu.cut'] ?? '剪切' },
                { role: 'copy', label: message['menu.copy'] ?? '复制' },
                { role: 'paste', label: message['menu.paste'] ?? '粘贴' },
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
                        { role: 'delete', label: message['menu.delete'] ?? '删除' },
                        { type: 'separator' },
                        { role: 'selectAll', label: message['menu.selectAll'] ?? '全选' }
                    ])
            ]
        },
        {
            label: message['menu.View'] ?? '视图',
            submenu: [
                { role: 'reload', label: message['menu.reload'] ?? '重新加载' },
                { role: 'forceReload', label: message['menu.forceReload'] ?? '强制重新加载' },
                { role: 'toggleDevTools', label: message['menu.toggleDevTools'] ?? '开发者工具', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom', label: message['menu.resetZoom'] ?? '重置缩放' },
                { role: 'zoomIn', label: message['menu.zoomIn'] ?? '放大' },
                { role: 'zoomOut', label: message['menu.zoomOut'] ?? '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: message['menu.togglefullscreen'] ?? '进入/退出全屏' }
            ]
        },
        {
            label: message['menu.Window'] ?? '窗口',
            submenu: [
                {
                    role: 'minimize',
                    label: message['menu.minimize'] ?? '最小化',
                    accelerator: 'Ctrl+Shift+M',
                },
                {
                    label: message['menu.maxmize'] ?? '最大化',
                    accelerator: 'Ctrl+Shift+Z',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.maximize();
                        }
                    }
                },
                {
                    label: message['menu.restore'] ?? '恢复',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.restore()
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
                        { role: 'close', label: message['menu.close'] ?? '退出' }
                    ])
            ]
        },
        ...(process.env.NODE_ENV === 'development' ? [{
            role: 'help',
            label: message['menu.Help'] ?? '帮助',
            submenu: [
                {
                    label: message['menu.LearnMore'] ?? '学习更多',
                    click: async () => {
                        await shell.openExternal('https://electronjs.org');
                    }
                }
            ]
        }] : [])
    ]

    return template;
}

let lang: string | undefined = 'zh-cn';

export async function setApplicationMenu(locale?: string) {
    if (locale === lang) return;
    const menu = Menu.buildFromTemplate(await getTemplate(locale || 'zh-cn'));
    Menu.setApplicationMenu(menu);
    lang = locale;
}

setApplicationMenu();//cjs 模式
