<template>
    <div class="terminal" ref="div" @click="onClick"></div>
</template>
<script setup lang="ts" name="Terminal">
import useClient from '@/store/useClient';
// import { useResize } from '@/utils/hooks';
import { onMounted, ref, onBeforeUnmount, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import type { ChannelType } from 'electron/ssh2';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
const props = defineProps<{ init?: boolean }>()
const clientStore = useClient();
const div = ref<HTMLDivElement>()
const term = new Terminal();

const channel = ref<ChannelType | null | undefined>(null);
const { t } = useI18n();
// useResize(div, term)
onMounted(() => {
    term.open(div.value!);
    term.resize(80, 43);//直接固定宽高列
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
        if (term.getSelection()) {
            window.document.execCommand('copy');
            ElMessage.success(t('copyed'));
        }
    })
})

async function initShell() {
    channel.value = await clientStore.client?.shell(data => {
        if (typeof data === 'string') {
            term.write(data);
        } else {
            if (data.action === 'upload') {
                term.write(data.message);
                ElMessage.warning('终端内直接上传文件还没施工呢！');
                channel.value?.write('\x18\x18\x18\x18\x18');
            }
            term.write(data.message);
        }
    });
}

defineExpose({
    initShell: () => {
        nextTick(() => {
            term.clear();
            initShell();
        })
    },
    focus: () => {
        term.focus();
    }
});

onBeforeUnmount(() => {
    channel.value?.end();
})

function onClick() {
    term.focus();
}
</script>
<style lang="less" scoped>
.terminal {
    width: 100%;
    min-height: 740px;
    background: #000;
    overflow: hidden;
    padding: 5px 0 0 11px;

    :deep(.xterm-viewport) {
        &::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 1);
            box-shadow: inset 0 0 5px rgba(255, 255, 255, 1);
        }
    }
}
</style>