import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    ignorePatterns: ['**/.svelte-kit/**', '**/svelte3-old/**'],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    printWidth: 120,
    tabWidth: 2,
    singleQuote: true,
    sortPackageJson: false,
    ignorePatterns: ['**/.svelte-kit/**', '**/svelte3-old/**'],
  },
  test: {
    passWithNoTests: true,
  },
});
