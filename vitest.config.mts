import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const src = resolve(import.meta.dirname, 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@app': resolve(src, 'app'),
      '@features': resolve(src, 'app/features'),
      '@tasks': resolve(src, 'app/features/tasks'),
      '@dashboard': resolve(src, 'app/features/dashboard'),
      '@env': resolve(src, 'environments/environment.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
