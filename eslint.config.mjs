import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Vue strict rules
    'vue/multi-word-component-names': 'off', // Allow single-word page names
    'vue/require-default-prop': 'error',
    'vue/no-v-html': 'warn',

    // General code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  }
})
