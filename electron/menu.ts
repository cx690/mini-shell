import { app, Menu, shell, BrowserWindow } from 'electron';

const isMac = process.platform === 'darwin';

function getTemplate(munu?: MenuLocale) {
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
            label: munu?.File ?? '文件',
            submenu: [
                {
                    label: munu?.settings ?? '设置',
                    click: (MenuItem: any, win: BrowserWindow) => {
                        const url = new URL(win.webContents.getURL());
                        if (url.hash !== '#/about/settings') {
                            url.hash = '#/about/settings';
                            win.loadURL(url.href);
                        }
                    }
                },
                { role: isMac ? 'close' : 'quit', label: munu?.quit ?? '退出' }
            ]
        },
        {
            label: munu?.Edit ?? '编辑',
            submenu: [
                { role: 'undo', label: munu?.undo ?? '撤销' },
                { role: 'redo', label: munu?.redo ?? '重做' },
                { type: 'separator' },
                { role: 'cut', label: munu?.cut ?? '剪切' },
                { role: 'copy', label: munu?.copy ?? '复制' },
                { role: 'paste', label: munu?.paste ?? '粘贴' },
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
                        { role: 'delete', label: munu?.delete ?? '删除' },
                        { type: 'separator' },
                        { role: 'selectAll', label: munu?.selectAll ?? '全选' }
                    ])
            ]
        },
        {
            label: munu?.View ?? '视图',
            submenu: [
                { role: 'reload', label: munu?.reload ?? '重新加载' },
                { role: 'forceReload', label: munu?.forceReload ?? '强制重新加载' },
                { role: 'toggleDevTools', label: munu?.toggleDevTools ?? '开发者工具', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom', label: munu?.resetZoom ?? '重置缩放' },
                { role: 'zoomIn', label: munu?.zoomIn ?? '放大' },
                { role: 'zoomOut', label: munu?.zoomOut ?? '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: munu?.togglefullscreen ?? '进入/退出全屏' }
            ]
        },
        {
            label: munu?.Window ?? '窗口',
            submenu: [
                {
                    role: 'minimize',
                    label: munu?.minimize ?? '最小化',
                    accelerator: 'Ctrl+Shift+M',
                },
                {
                    label: munu?.maxmize ?? '最大化',
                    accelerator: 'Ctrl+Shift+Z',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.maximize();
                        }
                    }
                },
                {
                    label: munu?.restore ?? '恢复',
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
                        { role: 'close', label: munu?.close ?? '退出' }
                    ])
            ]
        },
        ...(process.env.NODE_ENV === 'development' ? [{
            role: 'help',
            label: munu?.Help ?? '帮助',
            submenu: [
                {
                    label: munu?.LearnMore ?? '学习更多',
                    click: async () => {
                        await shell.openExternal('https://electronjs.org');
                    }
                }
            ]
        }] : [])
    ]

    return template;
}

let lang: string | undefined = 'zh-ch';

export type MenuLocale = {
    File: string,
    settings: string,
    quit: string,
    Edit: string,
    undo: string,
    redo: string,
    cut: string,
    copy: string,
    paste: string,
    delete: string,
    selectAll: string,
    View: string,
    reload: string,
    forceReload: string,
    toggleDevTools: string,
    resetZoom: string,
    zoomIn: string,
    togglefullscreen: string,
    zoomOut: string,
    Window: string,
    minimize: string,
    maxmize: string,
    restore: string,
    close: string,
    LearnMore: string,
    Help: string,
}
export function setApplicationMenu(local?: string, option?: { menu: MenuLocale }) {
    if (local === lang) return;
    const menu = Menu.buildFromTemplate(getTemplate(option?.menu));
    Menu.setApplicationMenu(menu);
    lang = local;
}

setApplicationMenu();
