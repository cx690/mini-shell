import { ElMessage as Message, ElLoading } from "element-plus";

const baseUrl = '';
type Method = 'GET' | 'POST' | 'HEAD' | 'DELETE' | 'PUT' | 'OPTIONS' | 'TRACE' | 'CONNECT';

type FetchOpt = RequestInit & {
    method?: Method | Lowercase<Method>,
    /** query 参数 */
    params?: Record<string, any>,
    /** body 参数 */
    data?: Record<string, any>,
    /** 是否展示遮罩，默认 true */
    showLoading?: boolean,
    /** 遮罩的文案 */
    loadingTip?: string;
}
const fetchDefault: RequestInit & {
    headers: {
        /** 发送后台的凭证 */
        accountToken?: string | null,
        token?: string | null,
    }
} = {
    method: 'GET',
    headers: {
        "Content-Type": "application/json; charset=utf-8"
    }
}

function getRequestQuery(params: Record<string, any>) { //目前无需考虑兼容性问题
    const query = paramFilter(params);
    const usp = new URLSearchParams(query);
    return usp.toString();
}

function paramFilter(params: Record<string, any> = {}) { //删除无用的数据
    const result: Record<string, any> = {};
    for (const k in params) {
        if (params[k] !== '' && params[k] !== undefined && params[k] !== null) {
            result[k] = params[k];
        }
    }
    return result;
}
/** 参数与请求url一个配置项，更接近axios */
export default function request<T = any>(opt: FetchOpt & { url: string }): Promise<Result<T>>;
/** 参数与请求url分开配置项，更接近原生fetch */
export default function request<T = any>(url: string, opt?: FetchOpt): Promise<Result<T>>;
export default function request<T = any>(urlOrOpt: string | (FetchOpt & { url: string }), fetchOpt: FetchOpt = {}): Promise<Result<T>> {
    let url = typeof urlOrOpt === 'string' ? urlOrOpt : urlOrOpt.url;
    const opt: (FetchOpt & { url?: string }) = typeof urlOrOpt === 'string' ? fetchOpt : urlOrOpt;
    url = baseUrl + url;
    // eslint-disable-next-line
    const { params, data, showLoading = true, loadingTip, headers, url: deleteUrl, ...props } = opt;
    const options = Object.assign({}, fetchDefault, props);
    if (headers) {
        options.headers = Object.assign({}, options.headers, headers)
    }
    options.method = options.method!.toUpperCase() as Method;
    if (params) {
        const query = getRequestQuery(params);
        if (query) {
            url = `${url}?${query}`;
        }
    }
    if (data) {
        options.body = JSON.stringify(data);
    }
    showLoading && setLoading(loadingTip);
    return window.fetch(url, options).then(async (response) => {
        showLoading && hideLoading();
        if (response.ok) {
            const res: Result = await response.json().catch(() => ({})) || {};
            if (res.code === 401) {
                Message.warning('登录信息丢失，请登录！');
                return {};
            }
            if (res.code !== 200) {
                Message.error(res.msg || '服务器繁忙，请稍后再试！');/*  */
            }
            return res;
        }
        Message.error(`请求出现异常：${response.statusText}`);
        console.error("Fetch Error : %s", response.statusText);
        return {};
    }).catch(() => {
        if (navigator.onLine === false) {
            Message.error('当前网络似乎已经断开！');
        } else {
            Message.error('服务器繁忙请稍后再试！');
        }
        showLoading && hideLoading();
        return {};
    })
}

export interface Result<T = any> {
    code?: number;
    data?: T;
    msg?: string;
}

// 当前正在请求的数量
let requestCount = 0;
let loading: null | ReturnType<typeof ElLoading.service> = null

export function setLoading(tip?: string) {
    if (requestCount === 0) {
        loading = ElLoading.service({
            lock: true,
            text: tip || '加载中……',
            background: 'hsla(0,0%,100%,.9)',
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