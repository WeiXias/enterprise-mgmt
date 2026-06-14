import { resolve } from 'path'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  // Nuxt 4 组件注册: common 目录组件去掉目录前缀
  // Nuxt 默认对 common/ 加 Common 前缀，这里设为空以直接使用组件名
  components: {
    dirs: [
      { path: '~/components/common', prefix: '' },
    ]
  },

  devtools: {
    enabled: true
  },

  css: [
    '~/assets/css/main.css',
  ],

  vite: {
    build: {
      cssMinify: true,
    },
    optimizeDeps: {
      include: ['@eigenpal/docx-editor-vue'],
    },
    ssr: {
      noExternal: [],
    },
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || process.env.NUXT_JWT_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.NUXT_JWT_REFRESH_SECRET || '',
    aiEncryptionKey: process.env.AI_ENCRYPTION_KEY || '',
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || '企业一体化管理系统'
    }
  },

  // Nitro 服务器别称 - 解决 Nuxt 4 中 ~ 指向 app/ 的问题
  nitro: {
    alias: {
      '#database': resolve(__dirname, 'server/database'),
      '#schema': resolve(__dirname, 'server/database/schema'),
      '#schema/users': resolve(__dirname, 'server/database/schema/users'),
      '#schema/customers': resolve(__dirname, 'server/database/schema/customers'),
      '#schema/opportunities': resolve(__dirname, 'server/database/schema/opportunities'),
      '#schema/products': resolve(__dirname, 'server/database/schema/products'),
      '#schema/contracts': resolve(__dirname, 'server/database/schema/contracts'),
      '#schema/projects': resolve(__dirname, 'server/database/schema/projects'),
      '#schema/commissions': resolve(__dirname, 'server/database/schema/commissions'),
      '#schema/system': resolve(__dirname, 'server/database/schema/system'),
      '#schema/ai': resolve(__dirname, 'server/database/schema/ai'),
      '#schema/im': resolve(__dirname, 'server/database/schema/im'),
      '#schema/todos': resolve(__dirname, 'server/database/schema/todos'),
      '#schema/seals': resolve(__dirname, 'server/database/schema/seals'),
      '#schema/suppliers': resolve(__dirname, 'server/database/schema/suppliers'),
      '#schema/purchases': resolve(__dirname, 'server/database/schema/purchases'),
      '#schema/sales': resolve(__dirname, 'server/database/schema/sales'),
      '#schema/workflow': resolve(__dirname, 'server/database/schema/workflow'),
      '#schema/accounting': resolve(__dirname, 'server/database/schema/accounting'),
      '#schema/reports': resolve(__dirname, 'server/database/schema/reports'),
      '#enums': resolve(__dirname, 'server/database/schema/enums'),
      '#server-utils': resolve(__dirname, 'server/utils'),
      '#ai-utils': resolve(__dirname, 'server/utils/ai')
    },

    // 压缩：Nitro 生产模式默认 gzip，此处显式开启 brotli 优先
    compressPublicAssets: true,
    // 安全头
    routeRules: {
      '/api/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '0',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
        },
      },
      // 静态资源缓存
      '/_nuxt/**': {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
    },

    // CORS（允许同源请求）
    // 如需前后端分离部署，改为具体域名
    experimental: {
      openAPI: false,
    },
  },

  // 安全头 — 前端页面
  app: {
    head: {
      meta: [
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
      ],
    },
  },

  compatibilityDate: '2025-01-15'
})
