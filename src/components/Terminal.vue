<template>
    <div class="terminal-div dark" ref="terminalDiv" @click="onClick" @dragenter="dragenter" @dragover="dragover"
        @drop="drop" @dragleave="dragleave">
        <div class="draging" v-if="state.draging">
            <div>
                <el-icon>
                    <Plus />
                </el-icon>
                <span>
                    {{ t('drag-files-to-upload') }}
                </span>
            </div>
        </div>
        <div class="terminal" ref="div"></div>
    </div>
</template>
<script setup lang="ts">
import useClient from '@/store/useClient';
import { useResize } from '@/utils/hooks';
import { onMounted, ref, onBeforeUnmount, nextTick, reactive } from 'vue';
import { Terminal } from '@xterm/xterm';
import type { ChannelType } from 'electron/preload/ssh2';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import Zmodem from 'zmodem.js/src/zmodem_browser.js';
import { Plus } from '@element-plus/icons-vue';
import { getAllFilesFromDataTransfer } from '@/utils/files';
import useSettings from '@/store/useSetting';

const props = defineProps<{ init?: boolean }>()
const clientStore = useClient();
const div = ref<HTMLDivElement>()
const term = new Terminal();
const settings = useSettings();
const channel = ref<ChannelType | null | undefined>(null);
let dragFiles: File[] = [];
const state = reactive({
    draging: false,
})
const terminalDiv = ref<HTMLDivElement>()
const { t } = useI18n();
useResize(div, term, channel);
onMounted(() => {
    term.open(div.value!);
    props.init && initShell();
    term.onKey((e) => {
        if (clientStore.status !== 2) {
            ElMessage.warning(t('connect-lose-term'));
        }
        if (e.key === '\x16') {// 粘贴
            window.navigator.clipboard.readText().then(res => {
                channel.value?.write(res);
            });
        } else {
            channel.value?.write(e.key);
        }
    })
    term.onSelectionChange(() => {
        const text = term.getSelection();
        if (text) {
            window.navigator.clipboard.writeText(text);
            ElMessage.success(t('copyed'));
        }
    })
})

let zsession: any = null;
async function initShell() {
    // 使用静态导入的Zmodem
    let zsentry: any = null;

    function sendToRemote(buf: Uint8Array) {
        // 确保传递的是Uint8Array或Buffer
        if (Array.isArray(buf)) {
            channel.value?.write(new Uint8Array(buf));
        } else {
            channel.value?.write(buf);
        }
    }

    function handleZmodemDetect(detection: any) {
        const session = detection.confirm();
        zsession = session;
        const abortSession = () => {
            session.abort();
            zsession = null;
            dragFiles = [];
        };
        if (session.type === 'receive') {
            // sz 下载到本地：每次只选择一次目录
            async function openPickerDir() {
                const res = await electronAPI.showOpenDialog({
                    title: t('pls-enter-save-dir'),
                    properties: ['openDirectory'],
                });
                if (res.canceled || !res.filePaths?.[0]) {
                    return null;
                }
                return res.filePaths[0].replace(/[/\\]+$/, '');
            };

            openPickerDir().then((dir: string | null) => {
                if (!dir) {
                    abortSession();
                    return
                };
                term.writeln(`\r[Zmodem] Receiving ……`);
                session.on('offer', (xfer: any) => {
                    xfer.accept().then(async (payload: Uint8Array[]) => {
                        const { name } = xfer.get_details();
                        const filePath = `${dir}/${name}`;
                        const blob = new Blob(payload.map(p => new Uint8Array(p)), { type: 'application/octet-stream' });
                        const arrayBuffer = await blob.arrayBuffer();
                        const status = await electronAPI.writeFile(filePath, arrayBuffer);
                        if (status === true) {
                            term.writeln(`\r[Zmodem] ${t('downloadfile-success')}: ${name}`);
                        } else {
                            term.writeln(`\r[Zmodem] ${t('downloadfile-error')}`);
                        }
                    })
                });
                session.start();
            });
        } else if (session.type === 'send') {
            // sz 上传到远程：先让用户选择「上传文件」或「上传文件夹」
            const sendFiles = (files: File[]) => {
                return Zmodem.Browser.send_files(session, files, {
                    on_offer_response: (obj: any) => {
                        term.writeln(`\r[Zmodem] ${t('Uploading')}: ${obj.name}`);
                    },
                    on_file_complete: (obj: any) => {
                        term.writeln(`\r[Zmodem] ${t('upload-success')}: ${obj.name}`);
                    },
                    on_error: (err: any) => {
                        term.writeln(`\r[Zmodem] ${t('upload-err', { err })}`);
                    },
                }).finally(() => {
                    if (session && typeof session.close === 'function') {
                        session.close();
                    }
                    zsession = null;
                    dragFiles = [];
                });
            };

            if (dragFiles.length > 0) {
                sendFiles(dragFiles);
                dragFiles = []
                return;
            }

            const openPicker = (isFolder: boolean) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                if (isFolder) {
                    input.setAttribute('webkitdirectory', '');
                    input.setAttribute('directory', '');
                }
                let cancelCheckTimeout: any = null;
                const focusHandler = () => {
                    if (cancelCheckTimeout) clearTimeout(cancelCheckTimeout);
                    cancelCheckTimeout = setTimeout(() => {
                        if (!input.files || input.files.length === 0) {
                            abortSession();
                            window.removeEventListener('focus', focusHandler, true);
                        }
                    }, 200);
                };
                input.onchange = () => {
                    window.removeEventListener('focus', focusHandler, true);
                    if (cancelCheckTimeout) clearTimeout(cancelCheckTimeout);
                    let files = Array.from(input.files || []);
                    if (files.length === 0) {
                        return;
                    }
                    if (isFolder && files[0].webkitRelativePath) {
                        files = files.map((f) =>
                            new File([f], f.webkitRelativePath || f.name, { lastModified: f.lastModified })
                        );
                    }
                    sendFiles(files);
                };
                window.addEventListener('focus', focusHandler, true);
                input.click();
            };

            ElMessageBox.confirm(t('zmodem-upload-mode'), 'Zmodem', {
                confirmButtonText: t('select-file'),
                cancelButtonText: t('select-dir'),
                cancelButtonClass: 'el-button--primary',
                type: 'warning',
                distinguishCancelAndClose: true,
            })
                .then(() => openPicker(false))
                .catch((action: string) => {
                    if (action === 'cancel') {
                        openPicker(true);
                    } else {
                        abortSession();
                    }
                });
        }
    }

    zsentry = new Zmodem.Sentry({
        to_terminal: (octets: Uint8Array) => {
            // 非Zmodem数据输出到终端
            term.write(new Uint8Array(octets));
        },
        on_detect: handleZmodemDetect,
        on_retract: () => {
            console.log('zmodem on_retract');
        },
        sender: sendToRemote
    });

    channel.value = await clientStore.client?.shell((data) => {
        if (data instanceof Uint8Array) {
            try {
                zsentry.consume(new Uint8Array(data));
            } catch (error) {
                const errMsg = String(error);
                // ZMODEM 传输结束后，协议期望收到 "OO"，但 SSH 有时会混入 shell 提示符/转义序列
                if (errMsg.includes('Only thing after ZFIN should be') && errMsg.includes('not:')) {
                    const match = errMsg.match(/not:\s*([\d,\s]+)/);
                    if (match) {
                        const bytes = match[1].split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                        if (bytes.length > 0) {
                            term.write(new Uint8Array(bytes));
                        }
                    }
                    zsession = null;
                    zsentry._zsession = null;  // 清除 zsentry 内部 session，避免后续数据继续发往损坏的 session 导致重复输出
                } else {
                    console.log('consume error', error);
                }
            }
            return;
        }
        if (data && typeof data === 'object') {
            if (data.action === 'close') {
                try {
                    zsession?.close?.();
                    zsession = null;
                } catch (error) {
                }
            }
            term.write(data.message);
            return;
        }
        term.write(data);
    });
}

defineExpose({
    initShell: () => {
        nextTick(() => {
            term.clear();
            channel.value?.destroy();
            dragFiles = [];
            initShell();
        })
    },
    focus: () => {
        term.focus();
    }
});

onBeforeUnmount(() => {
    try {
        zsession?.close?.();
    } catch (error) {
        console.log('error', error);
    }
    zsession = null;
    dragFiles = [];
    channel.value?.destroy();
})

function onClick() {
    term.focus();
}

function dragenter(e: DragEvent) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragFiles = [];
    state.draging = true;
}
function dragover(e: DragEvent) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    state.draging = true;
}

async function drop(e: DragEvent) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    state.draging = false;
    const dt = e.dataTransfer;
    if (!dt) return;
    const files = await getAllFilesFromDataTransfer(dt);
    if (files.length > 0) {
        if (clientStore.status !== 2) {
            ElMessage.warning(t('connect-lose-term'));
        } else if (channel.value) {
            dragFiles = files;
            channel.value.write(`${settings.config.zmodemCmd || 'rz -y'}\r`);
        }
    } else {
        dragFiles = [];
    }
}

function dragleave(e: DragEvent) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && terminalDiv.value?.contains(relatedTarget)) {
        return;
    }
    dragFiles = [];
    state.draging = false;
}
</script>
<style lang="less" scoped>
.terminal-div {
    width: 100%;
    min-width: 900px;
    min-height: 740px;
    background: #000;
    overflow: hidden;
    padding: 5px 0 0 11px;
    position: relative;

    .draging {
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        z-index: 1;
    }

    .terminal {
        width: 100%;
        height: 100%;
        background: #000;
        overflow: hidden;
        position: relative;
        min-width: 900px;
        min-height: 740px;
    }
}
</style>