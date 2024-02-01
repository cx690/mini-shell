import { app, Menu, shell, BrowserWindow } from 'electron';

const isMac = process.platform === 'darwin';

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
        label: '文件',
        submenu: [
            { role: isMac ? 'close' : 'quit', label: '退出' }
        ]
    },
    {
        label: '编辑',
        submenu: [
            { role: 'undo', label: '撤销' },
            { role: 'redo', label: '重做' },
            { type: 'separator' },
            { role: 'cut', label: '剪切' },
            { role: 'copy', label: '复制' },
            { role: 'paste', label: '粘贴' },
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
                    { role: 'delete', label: '删除' },
                    { type: 'separator' },
                    { role: 'selectAll', label: '全选' }
                ])
        ]
    },
    {
        label: '视图',
        submenu: [
            { role: 'reload', label: '重新加载' },
            { role: 'forceReload', label: '强制重新加载' },
            { role: 'toggleDevTools', label: '开发者工具', accelerator: 'F12' },
            { type: 'separator' },
            { role: 'resetZoom', label: '重置缩放' },
            { role: 'zoomIn', label: '放大' },
            { role: 'zoomOut', label: '缩小' },
            { type: 'separator' },
            { role: 'togglefullscreen', label: '进入/退出全屏' }
        ]
    },
    {
        label: '窗口',
        submenu: [
            {
                role: 'minimize',
                label: '最小化',
                accelerator: 'Ctrl+Shift+M',
            },
            {
                label: '最大化',
                accelerator: 'Ctrl+Shift+Z',
                click: (item: any, win: BrowserWindow) => {
                    if (win) {
                        win.maximize();
                    }
                }
            },
            {
                label: '恢复',
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
                    { role: 'close', label: '退出' }
                ])
        ]
    },
    ...(process.env.NODE_ENV === 'development' ? [{
        role: 'help',
        label: '帮助',
        submenu: [
            {
                label: '学习更多',
                click: async () => {
                    await shell.openExternal('https://electronjs.org');
                }
            }
        ]
    }] : [])
]

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
