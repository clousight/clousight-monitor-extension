import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

// Flat config (ESLint 9/10). Replaces the legacy .eslintrc.js + .eslintignore.
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,cts,tsx,vue,js,cjs,mjs}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['dist/**', 'dist-firefox/**', 'api/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'docs/.vitepress/cache/**', 'docs/.vitepress/dist/**']
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: 'app/rules',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-console':
        process.env.NODE_ENV === 'production' ? ['warn', { allow: ['warn', 'error'] }] : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/multi-word-component-names': 'error'
    }
  },
  {
    // Page components are route-level singletons; single-word names are fine.
    name: 'app/pages',
    files: ['src/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    // AppIcon renders a static, internal SVG constant map (never user input).
    name: 'app/app-icon',
    files: ['src/components/AppIcon.vue'],
    rules: {
      'vue/no-v-html': 'off'
    }
  },
  {
    // CommonJS Node scripts and build configs legitimately use require().
    name: 'app/node-cjs',
    files: ['scripts/**/*.js', '*.config.js', 'tailwind.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
);
