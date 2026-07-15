module.exports = {
  root: true,
  env: {
    node: true,
    webextensions: true,
    browser: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
    '@vue/prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module'
  },
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
  },
  overrides: [
    {
      files: ['**/*.test.ts', 'tests/**/*.{ts,tsx}'],
      env: { node: true }
    },
    {
      files: ['src/pages/**/*.vue'],
      rules: {
        'vue/multi-word-component-names': 'off'
      }
    },
    {
      // AppIcon renders a static, internal SVG constant map (never user input).
      files: ['src/components/AppIcon.vue'],
      rules: {
        'vue/no-v-html': 'off'
      }
    }
  ]
};
