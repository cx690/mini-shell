import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import checker from 'vite-plugin-checker';
import electron from 'vite-plugin-electron'
// import legacy from '@vitejs/plugin-legacy';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { version } from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),//如需要编写.vue文件，请开启此插件
    // legacy({
    //   targets: ['defaults', 'not dead'],//现代模式，可兼容更早版本的浏览器
    // }),
    checker({
      vueTsc: true,
      overlay: {
        initialIsOpen: false,
      },
      eslint: {
        lintCommand: 'eslint --ext .js,.ts,.tsx,.vue ./src ./electron',
      },
      enableBuild: false,
    }),
    electron([
      {
        entry: 'electron/main.ts'
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
          // instead of restarting the entire Electron App.
          options.reload()
        },
      },
    ]),
    Components({
      dirs: [],//不自动导入sr/components的组件作为组件
      dts: false,//无需生成全局组件类型文件
      resolvers: ElementPlusResolver({
        importStyle: false,
      }),
    }),
    {
      ...codeInspectorPlugin({
        bundler: 'vite',
      }),
      apply: 'serve'
    }
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          hack: `true; @import (reference) "${path.resolve('src/assets/styles/var.less')}";`,
        },
      }
    }
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ]
  },
  define: {
    'process.env.buildTime': JSON.stringify(Date.now()),
    'process.env.version': JSON.stringify(version),
  },
  build: {
    target: ['chrome124'],
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1024,//超过1mb警告
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-chunk.js',
        assetFileNames: (chunkInfo) => /\.css$/.test(chunkInfo.name || '') ? 'css/[name].[ext]' : 'assets/[name].[ext]',
        manualChunks: function (id) {//防止文件因为异步块问题碎片化
          if (/node_modules\/.*\.css$/.test(id)) {
            return;
          }
          if (/node_modules\/(vue|vue-router|pinia)/.test(id)) {
            return 'vue';
          }
          if (/node_modules\/(element-plus)/.test(id)) {
            return 'elementui';
          }
          if (/node_modules/.test(id)) {
            return 'vendor';
          }
        }
      },
    }
  },
  server: {
    // host: '0.0.0.0',
    port: 9527,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})
