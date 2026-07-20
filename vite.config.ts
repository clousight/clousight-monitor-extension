import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  // MV3 extensions run under `script-src 'self'`, which forbids eval/new Function.
  // vue-i18n's built-in message compiler uses `new Function`, so we drop it at
  // build time and supply our own eval-free compiler (src/i18n/messageCompiler.ts).
  // These are the compile-time feature flags vue-i18n expects a bundler to define.
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_JIT_COMPILATION__: false,
    __INTLIFY_DROP_MESSAGE_COMPILER__: true,
    __INTLIFY_PROD_DEVTOOLS__: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Force the esm-bundler builds of vue-i18n and its @intlify deps. Vite's
      // default `browser` condition otherwise pulls the esm-browser builds,
      // which ship an eval-based (`new Function`) message compiler that MV3 CSP
      // rejects. The esm-bundler builds are eval-free and honor the define flags
      // above; the runtime build also drops the built-in compiler entirely, so
      // our cspMessageCompiler does the work.
      'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js',
      '@intlify/core-base': '@intlify/core-base/dist/core-base.esm-bundler.js',
      '@intlify/message-compiler': '@intlify/message-compiler/dist/message-compiler.esm-bundler.js'
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@vue/test-utils', 'vue']
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: chunkInfo =>
          chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
