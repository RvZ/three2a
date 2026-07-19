import { defineConfig } from 'vitest/config';

// The game is a static, dependency-light Three.js app. Vite gives us a dev
// server with HMR, bundling with tree-shaking for `three`, and a production
// build — replacing the previous unpkg CDN importmap.
export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    // Vitest config lives here so we keep a single source of truth.
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.ts'],
    },
  },
});
