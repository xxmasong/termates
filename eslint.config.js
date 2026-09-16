import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['client/dist', 'node_modules'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@/features/*/api/*',
            '@/features/*/components/*',
            '@/features/*/hooks/*',
            '@/features/*/state/*',
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
