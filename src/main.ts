import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'normalize.css';
import 'element-plus/theme-chalk/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/assets/styles/index.less';
import '@xterm/xterm/css/xterm.css';
import App from './App.vue';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import i18n, { loadLocales } from './i18n';
import router from './router';
import BasePage from '@/components/basePage.vue';
import './excute';

loadLocales().then(() => {
    const app = createApp(App);
    app.component('BasePage', BasePage);
    app.use(i18n);
    app.use(createPinia()).use(router);
    app.mount('#app');
})
