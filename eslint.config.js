// @ts-check
const js = require('@eslint/js');
const globals = require('globals');
const playwright = require('eslint-plugin-playwright');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'test-artifacts/', 'blob-report/', '.auth/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.js', 'fixtures/**/*.js'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Page-object methods named expect*() contain the assertions.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect[A-Z]'] }],
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-skipped-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
  {
    // Fixtures must destructure their (possibly empty) dependency object - Playwright requires it.
    files: ['fixtures/**/*.js'],
    rules: { 'no-empty-pattern': 'off' },
  },
  prettier,
];
