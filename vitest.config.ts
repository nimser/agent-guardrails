import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@matcher': path.resolve(__dirname, 'src/matcher'),
      '@resolver': path.resolve(__dirname, 'src/resolver'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@packs': path.resolve(__dirname, 'src/packs'),
    },
  },
});
