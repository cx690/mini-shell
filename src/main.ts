import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'normalize.css';
import 'element-plus/theme-chalk/index.css'
import '@/assets/styles/index.less';
import 'xterm/css/xterm.css';
import App from './App.vue';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import i18n from './i18n';
import router from './router';
import BasePage from '@/components/basePage.vue';
import './excute';

const app = createApp(App);
app.component('BasePage', BasePage);
app.use(i18n);
app.use(createPinia()).use(router);
app.mount('#app');

console.info('构建时间：%s', process.env.buildTime);
