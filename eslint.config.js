import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Flat config (ESLint 9). Applies the recommended JS + TypeScript rules.
// `no-console` is a warning: all real logging should go through DebugUtils,
// but we don't want it to hard-fail the build during migration.
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'js/vendor/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        AudioContext: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        Image: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        matchMedia: 'readonly',
        // Loaded at runtime from a vendored script on mobile.
        nipplejs: 'readonly',
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Existing gameplay modules are still plain JS mid-migration; relax the
    // TS-only rules there until each is ported to .ts.
    files: ['js/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Node-based tooling / e2e scripts.
    files: ['test/e2e/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
