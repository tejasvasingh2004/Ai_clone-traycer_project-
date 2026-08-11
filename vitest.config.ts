import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.js'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/repositories/**',
      '**/staging/**',
      '**/plans/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'server/**/*.ts'],
      exclude: [
        'src/cli.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.js',
      ],
    },
  },
});
