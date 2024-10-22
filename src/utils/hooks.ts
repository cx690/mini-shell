import { onActivated, computed, Ref, onMounted, onBeforeMount, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from 'vue-i18n';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from "@xterm/xterm";
import { debounce } from ".";
import type { ChannelType } from 'electron/preload/ssh2';

// import type { Terminal } from "@xterm/xterm";
// import { FitAddon } from "xterm-addon-fit";
// import { debounce } from ".";

/** 
 * 重新激活路由时执行useRefresh的回调，有两种方式都可以，优先路由设置的刷新信息
  ```js
  //方式一：路由上设置刷新信息
 router.push({
    path: 'xxx',
    state: {
        refresh: true,
    }
 })
 //方式二：将某个路由的名字置入刷新列表中，重新激活该路由时也将执行useRefresh的回调
import { addRefresh } from '@/utils/hooks';
addRefresh('accountBook');
  ```
 */
export function useRefresh(refreshFn: () => any) {
    let isSetup = true;
    const route = useRoute();
    onActivated(() => {
        let reFreshed = false;
        if (window.history.state.refresh) {
            if (!isSetup) {
                refreshFn();
                reFreshed = true;
            }
            const newState = { ...window.history.state, refresh: false };
            window.history.replaceState(newState, '');
        }

        if (route.name && reFresh.has(route.name)) {
            if (!isSetup && !reFreshed) {
                refreshFn();
            }
            reFresh.delete(route.name);
        }
        isSetup = false;
    })
}

/** 被置于刷新列表的路由 */
export const reFresh = new Set<string | symbol>();
/** 
 * 添加要刷新的路由
 * @param name 要刷新的路由名  
 */
export function addRefresh(name: string | string[]) {
    if (Array.isArray(name)) {
        for (const item of name) {
            reFresh.add(item);
        }
    } else {
        reFresh.add(name);
    }
    return reFresh;
}

export function useEnum<T extends Record<string, string> = Record<string, string>>(callback: (t: (...args: any[]) => string) => T) {
    const { t } = useI18n();
    return computed<T>(() => callback(t));
}

/** 重置视图大小并通知channel重置大小 */
export function useResize(div: Ref<HTMLDivElement | null | undefined>, term: Terminal, channel: Ref<ChannelType | null | undefined>) {
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const fit = debounce((opt: { width: number, height: number }) => {
        fitAddon.fit();
        channel.value?.setWindow(Object.assign(opt, fitAddon.proposeDimensions()));
    })
    const rob = new ResizeObserver((entries) => {
        const el = entries.find(el => el.target === div.value)?.target as (HTMLDivElement | undefined);
        if (el && el.offsetHeight && el.offsetWidth) {
            fit({ width: el.offsetWidth, height: el.offsetHeight });
        }
    })

    onMounted(() => {
        div.value && rob.observe(div.value);
    })

    onBeforeMount(() => {
        div.value && rob.unobserve(div.value);
    })

    watch(channel, () => {
        if (div.value && channel.value) {
            fit({ width: div.value.offsetWidth, height: div.value.offsetHeight });
        }
    })
    return fit;
}