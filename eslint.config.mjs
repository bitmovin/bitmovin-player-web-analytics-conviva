// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// This config is a direct port of the rules previously enforced by tslint.json.
// It intentionally does NOT enable the broad typescript-eslint "recommended"
// preset, to keep linting behavior equivalent to the prior tslint setup.
//
// Formatting concerns (indentation, quotes, semicolons, trailing commas,
// whitespace) are left to Prettier, which is run via the `format` script and
// lint-staged. ESLint here only covers the non-formatting rules tslint had.
export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'class', format: ['PascalCase'] },
      ],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'no-eval': 'error',
      'no-redeclare': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
);
