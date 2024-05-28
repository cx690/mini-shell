<template>
    <div class="output" ref="output">
        <div v-html="content"></div>
    </div>
</template>
<script setup lang="ts" name="Terminal">
import { nextTick, ref } from 'vue';
const output = ref<HTMLDivElement>()
const content = ref('');
defineExpose({
    write: (data: string, scroll = true) => {
        content.value += data;
        if (scroll) {
            nextTick(() => {
                output.value?.scrollTo({
                    left: 0,
                    top: output.value.scrollHeight,
                    behavior: 'smooth'
                })
            })
        }
    },
    clear: () => {
        content.value = '';
    }
});
</script>
<style lang="less" scoped>
.output {
    width: 100%;
    height: 700px;
    padding: 5px 11px;
    background: #000;
    overflow: auto;
    color: #fff;
    line-height: 17px;
    font-size: 15px;
    font-family: monospace;

    &::-webkit-scrollbar-thumb {
        background-color: #fff3;
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: #fff6;
    }

    :deep(>div) {
        pre {
            font-family: inherit;
        }

        .title {
            color: #8ae234;
        }

        .subtitle {
            color: #729fcf;
        }

        .cmd {
            color: var(--el-color-primary);
        }

        .env {
            color: var(--el-color-primary-dark-2);
        }

        .success {
            color: #fff;
        }

        .warning {
            color: var(--el-color-warning);
        }

        .error {
            color: var(--el-color-danger-dark-2);
        }

        .cancel {
            color: var(--el-color-warning);
        }
    }
}
</style>
