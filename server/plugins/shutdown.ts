/**
 * 优雅关闭 — 监听 SIGTERM / SIGINT，关掉 DB 连接后再退出。
 */
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
    console.error('[unhandledRejection]', reason)
  })
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err)
    process.exit(1)
  })
})
