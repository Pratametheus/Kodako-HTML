import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
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
