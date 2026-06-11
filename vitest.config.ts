import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#database': fileURLToPath(new URL('./server/database', import.meta.url)),
      '#schema': fileURLToPath(new URL('./server/database/schema', import.meta.url)),
      '#server-utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
    },
  },
})
