<template>
    <div class="terminal dark" ref="div" @click="onClick"></div>
</template>
<script setup lang="ts">
import useClient from '@/store/useClient';
import { useResize } from '@/utils/hooks';
import { onMounted, ref, onBeforeUnmount, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import type { ChannelType } from 'electron/preload/ssh2';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import Zmodem from 'zmodem.js/src/zmodem_browser.js';

const props = defineProps<{ init?: boolean }>()
const clientStore = useClient();
const div = ref<HTMLDivElement>()
const term = new Terminal();

const channel = ref<ChannelType | null | undefined>(null);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let ZmodemActive = false;

    function sendToRemote(buf: Uint8Array) {
        // 确保传递的是Uint8Array或Buffer
        if (Array.isArray(buf)) {
            channel.value?.write(new Uint8Array(buf));
        } else {
            channel.value?.write(buf);
        }
    }

    function handleZmodemDetect(detection: any) {
        ZmodemActive = true;
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
            // sz 上传到远程
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            let cancelCheckTimeout: any = null;
            const focusHandler = () => {
                if (cancelCheckTimeout) clearTimeout(cancelCheckTimeout);
                cancelCheckTimeout = setTimeout(() => {
                    if (!input.files || input.files.length === 0) {
                        // 用户取消选择文件
                        session.abort();
                        zsession = null;
                        ZmodemActive = false;
                        setTimeout(() => {
                            channel.value?.write('\x18\x18\x18\x18\x18');
                        }, 100)
                        window.removeEventListener('focus', focusHandler, true);
                    }
                }, 200);
            };
            input.onchange = () => {
                window.removeEventListener('focus', focusHandler, true);
                if (cancelCheckTimeout) clearTimeout(cancelCheckTimeout);
                const files = Array.from(input.files || []);
                if (files.length === 0) {
                    return;
                }
                Zmodem.Browser.send_files(session, files, {
                    on_offer_response: (obj: any) => {
                        term.writeln(`\r\n[Zmodem] ${t('Uploading')}: ${obj.name}`);
                    },
                    on_file_complete: (obj: any) => {
                        term.writeln(`\r[Zmodem] ${t('upload-success')}: ${obj.name}`);
                    },
                    on_error: (err: any) => {
                        term.writeln(`\r[Zmodem] ${t('upload-err', { err })}`);
                    },
                    // on_progress: (obj: any, xfer: any, buffer: Uint8Array) => {
                    // }
                }).finally(() => {
                    session.close();
                    zsession = null;
                    ZmodemActive = false;
                });
            };
            window.addEventListener('focus', focusHandler, true);
            input.click();
        }
    }

    zsentry = new Zmodem.Sentry({
        to_terminal: (octets: Uint8Array) => {
            // 非Zmodem数据输出到终端
            term.write(new Uint8Array(octets));
        },
        on_detect: handleZmodemDetect,
        on_retract: () => {
            ZmodemActive = false;
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
                    ZmodemActive = false;
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
</script>
<style lang="less" scoped>
.terminal {
    width: 100%;
    min-width: 900px;
    min-height: 740px;
    background: #000;
    overflow: hidden;
    padding: 5px 0 0 11px;
}
</style>