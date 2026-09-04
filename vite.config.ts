import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
      output: {
        manualChunks(id: string): string | undefined {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/blockly/')) return 'vendor-blockly';
          if (normalized.includes('/node_modules/highlight.js/')) return 'vendor-hljs';
          if (normalized.includes('/node_modules/js-interpreter/')) return 'vendor-interpreter';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    alias: {
      '@tauri-apps/plugin-dialog': resolve(__dirname, 'tests/stubs/tauri-dialog.ts'),
      '@tauri-apps/plugin-fs': resolve(__dirname, 'tests/stubs/tauri-fs.ts'),
    },
  },
});
