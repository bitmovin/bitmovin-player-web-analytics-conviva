// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Base ruleset is typescript-eslint's "recommended" preset, augmented with some
// non-formatting rules.
//
// Formatting concerns (indentation, quotes, semicolons, trailing commas,
// whitespace) are left to Prettier, which is run via the `format` script and
// lint-staged.
export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      // Allow intentionally-unused args (e.g. interface-mandated params) to be
      // prefixed with an underscore.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'class', format: ['PascalCase'] },
      ],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'no-eval': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
);
