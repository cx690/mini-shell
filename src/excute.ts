let num = 0;

/** 获取当前运行的任务数量 */
export function getTaskNum() {
    return num;
}

export function setTaskNum(n: number) {
    num = n;
    electronAPI.setTaskNum(n);
}

window.Excute = {
    getTaskNum,
    setTaskNum,
}
