import { app, Menu, shell, BrowserWindow } from 'electron';

const isMac = process.platform === 'darwin';

function getTemplate(local = 'zh-cn') {
    const isEn = local === 'en';
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
            label: isEn ? 'File' : '文件',
            submenu: [
                { role: isMac ? 'close' : 'quit', label: isEn ? 'quit' : '退出' }
            ]
        },
        {
            label: isEn ? 'Edit' : '编辑',
            submenu: [
                { role: 'undo', label: isEn ? 'undo' : '撤销' },
                { role: 'redo', label: isEn ? 'redo' : '重做' },
                { type: 'separator' },
                { role: 'cut', label: isEn ? 'cut' : '剪切' },
                { role: 'copy', label: isEn ? 'copy' : '复制' },
                { role: 'paste', label: isEn ? 'paste' : '粘贴' },
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
                        { role: 'delete', label: isEn ? 'undo' : '删除' },
                        { type: 'separator' },
                        { role: 'selectAll', label: isEn ? 'undo' : '全选' }
                    ])
            ]
        },
        {
            label: isEn ? 'View' : '视图',
            submenu: [
                { role: 'reload', label: isEn ? 'reload' : '重新加载' },
                { role: 'forceReload', label: isEn ? 'forceReload' : '强制重新加载' },
                { role: 'toggleDevTools', label: isEn ? 'toggleDevTools' : '开发者工具', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom', label: isEn ? 'resetZoom' : '重置缩放' },
                { role: 'zoomIn', label: isEn ? 'zoomIn' : '放大' },
                { role: 'zoomOut', label: isEn ? 'zoomOut' : '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: isEn ? 'togglefullscreen' : '进入/退出全屏' }
            ]
        },
        {
            label: isEn ? 'Window' : '窗口',
            submenu: [
                {
                    role: 'minimize',
                    label: isEn ? 'minimize' : '最小化',
                    accelerator: 'Ctrl+Shift+M',
                },
                {
                    label: isEn ? 'maxmize' : '最大化',
                    accelerator: 'Ctrl+Shift+Z',
                    click: (item: any, win: BrowserWindow) => {
                        if (win) {
                            win.maximize();
                        }
                    }
                },
                {
                    label: isEn ? 'restore' : '恢复',
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
                        { role: 'close', label: isEn ? 'close' : '退出' }
                    ])
            ]
        },
        ...(process.env.NODE_ENV === 'development' ? [{
            role: 'help',
            label: isEn ? 'Help' : '帮助',
            submenu: [
                {
                    label: isEn ? 'Learn more' : '学习更多',
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
export function setApplicationMenu(local?: string) {
    if (local === lang) return;
    const menu = Menu.buildFromTemplate(getTemplate(local));
    Menu.setApplicationMenu(menu);
    lang = local;
}

setApplicationMenu('en');
