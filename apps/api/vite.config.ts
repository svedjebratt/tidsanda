import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['index.ts'],
    format: ['cjs'],
    outDir: 'dist',
    platform: 'node',
    target: 'node22',
    deps: {
      alwaysBundle: ['@aws-sdk/client-dynamodb'],
      onlyBundle: false,
    },
  },
});
