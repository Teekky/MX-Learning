import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow deliberately-unused args/vars when prefixed with `_`
      // (e.g. a component prop kept for the interface but not read).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Stylistic only, never a bug. The French grammar/tense corpora are
      // full of `l\'un`-style escapes inside double-quoted and template
      // strings — harmless, and not worth a risky bulk edit.
      'no-useless-escape': 'warn',
      /*
       * eslint-plugin-react-hooks v7 ships several new, still-maturing rules
       * that flag patterns rather than proven bugs: reading `Date.now()` in a
       * `useState` initializer, writing a mirror ref during render, a
       * setState in an effect body. The practice-session modules lean on
       * these idioms heavily. Untangling them is its own refactor (it needs
       * visual QA on the redesign branch), so they are warnings for now —
       * visible as a backlog, not a red build.
       */
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
])
