import { ElLoading } from "element-plus";

// 当前正在请求的数量
let requestCount = 0;
let loading: null | ReturnType<typeof ElLoading.service> = null

export function setLoading(tip?: string) {
    if (requestCount === 0) {
        loading = ElLoading.service({
            lock: true,
            text: tip || '加载中……',
            target: document.body
        })
    }
    requestCount++
}

// 隐藏loading
export function hideLoading() {
    requestCount--;
    if (requestCount <= 0) {
        loading?.close();
        loading = null;
    }
}