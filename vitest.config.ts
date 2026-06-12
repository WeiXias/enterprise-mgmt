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
      '#schema/users': fileURLToPath(new URL('./server/database/schema/users', import.meta.url)),
      '#schema/customers': fileURLToPath(new URL('./server/database/schema/customers', import.meta.url)),
      '#schema/opportunities': fileURLToPath(new URL('./server/database/schema/opportunities', import.meta.url)),
      '#schema/products': fileURLToPath(new URL('./server/database/schema/products', import.meta.url)),
      '#schema/contracts': fileURLToPath(new URL('./server/database/schema/contracts', import.meta.url)),
      '#schema/projects': fileURLToPath(new URL('./server/database/schema/projects', import.meta.url)),
      '#schema/commissions': fileURLToPath(new URL('./server/database/schema/commissions', import.meta.url)),
      '#schema/system': fileURLToPath(new URL('./server/database/schema/system', import.meta.url)),
      '#schema/ai': fileURLToPath(new URL('./server/database/schema/ai', import.meta.url)),
      '#schema/im': fileURLToPath(new URL('./server/database/schema/im', import.meta.url)),
      '#schema/todos': fileURLToPath(new URL('./server/database/schema/todos', import.meta.url)),
      '#enums': fileURLToPath(new URL('./server/database/schema/enums', import.meta.url)),
      '#server-utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
      '#ai-utils': fileURLToPath(new URL('./server/utils/ai', import.meta.url)),
    },
  },
})
