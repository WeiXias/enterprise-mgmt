/**
 * 优雅关闭 — 监听 SIGTERM / SIGINT，关掉 DB 连接后再退出。
 */

// 脱敏字段名（大小写不敏感），防止 AI API Key / token / password 等泄露到日志
const SENSITIVE_KEYS = ['apikey', 'api_key', 'token', 'password', 'secret', 'authorization', 'jwt', 'key']

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitize)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))
    out[k] = isSensitive ? '***REDACTED***' : sanitize(v)
  }
  return out
}
let isShuttingDown = false

export default defineNitroPlugin(() => {
  async function shutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true
    console.log(`[shutdown] received ${signal}, draining...`)

    try {
      // 关闭 SQLite 连接 (better-sqlite3)
      const { db } = await import('#database')
      if (db && typeof (db as any).close === 'function') {
        ;(db as any).close()
      }
    } catch { /* db 可能已经是 undefined */ }

    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', sanitize(reason))
  })
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', sanitize(err))
    process.exit(1)
  })
})
