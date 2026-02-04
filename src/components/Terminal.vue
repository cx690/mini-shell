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
        if (session.type === 'receive') {
            // rz 上传到本地
            session.on('offer', (xfer: any) => {
                term.writeln(`\r\n[Zmodem] Receiving ……`);
                xfer.accept().then((payload: Uint8Array[]) => {
                    // 合并所有块，确保为BlobPart[]
                    const blob = new Blob(payload.map(p => new Uint8Array(p)), { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    // 自动下载
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = xfer.get_details().name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    term.writeln(`\r[Zmodem] ${t('downloadfile-success')}: ${xfer.get_details().name}`);
                });
            });
            session.start();
        } else if (session.type === 'send') {
            // sz 上传到远程：先让用户选择「上传文件」或「上传文件夹」
            const abortSession = () => {
                session.abort();
                zsession = null;
                dragFiles = [];
                setTimeout(() => {
                    channel.value?.write('\x18\x18\x18\x18\x18');
                }, 100);
            };

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
                    session.close();
                    zsession = null;
                    dragFiles = [];
                });
            };

            if (dragFiles.length > 0) {
                sendFiles(dragFiles);
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
            zsentry.consume(new Uint8Array(data));
            return;
        }
        if (data && typeof data === 'object') {
            if (data.action === 'close') {
                if (zsession) {
                    zsession.close?.();
                    zsession = null;
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
            initShell();
        })
    },
    focus: () => {
        term.focus();
    }
});

onBeforeUnmount(() => {
    if (zsession) {
        zsession.close?.();
        zsession = null;
    }
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
            channel.value.write(`rz${settings.config.zmodemOverwrite ? ' -y' : ''}${settings.config.zmodemAnsiEscape ? ' -e' : ''}\r`);
        }
    }
}
console.log(settings.config);
function dragleave(e: DragEvent) {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && terminalDiv.value?.contains(relatedTarget)) {
        return;
    }
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
        padding: 5px 0 0 11px;
    }
}
</style>