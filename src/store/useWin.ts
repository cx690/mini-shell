import { defineStore } from 'pinia';
import { ref } from 'vue';

const useWin = defineStore('win', () => {
    const close = ref<boolean>(false);
    function setClose(target: boolean) {
        close.value = target;
    }
    return {
        close,
        setClose
    }
})

export default useWin;
