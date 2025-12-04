import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,              
    coverage: { provider: 'v8' },
    env: {
      NODE_ENV: 'test'  
    }
  },
});