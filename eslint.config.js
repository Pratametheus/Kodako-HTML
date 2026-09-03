import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src-tauri/target', 'node_modules', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly' },
    },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
);
