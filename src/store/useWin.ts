import { defineStore } from 'pinia';
import { ref } from 'vue';

const useWin = defineStore('win', () => {
    const close = ref<boolean>(false);
    return {
        close,
    }
})

export default useWin;
