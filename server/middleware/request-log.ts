/**
 * 结构化请求日志 — 每条 API 请求记录方法、路径、耗时、状态码。
 * 放在 auth middleware 之后、业务 handler 之前运行。
 * 格式：{ timestamp, method, path, status, durationMs, userId, ip }
 */
import { defineEventHandler, getRequestHeader } from 'h3'

function ts(): string {
  return new Date().toISOString()
}

export default defineEventHandler(async (event) => {
  const url = event.path || ''
  if (!url.startsWith('/api/')) return

  const method = event.method || 'UNKNOWN'
  const start = Date.now()

  try {
    // 将响应钩子挂到 node 原生 response 上，拦截状态码
    const nodeRes = event.node?.res
    let statusCode = 0
    if (nodeRes) {
      const originalEnd = nodeRes.end.bind(nodeRes)
      nodeRes.end = function (...args: any[]) {
        statusCode = nodeRes.statusCode
        return originalEnd(...args)
      } as typeof nodeRes.end
    }

    await event.$waitUntil?.(undefined) // continue to handler

    const duration = Date.now() - start
    const userId = (event.context.user as { userId?: string } | undefined)?.userId || '-'
    const ip = getRequestHeader(event, 'x-forwarded-for')
      || getRequestHeader(event, 'x-real-ip')
      || event.node?.req?.socket?.remoteAddress
      || ''

    const log = {
      ts: ts(),
      method,
      path: url,
      status: statusCode || 200,
      duration: `${duration}ms`,
      userId,
      ip,
    }

    // 精简输出：跳过静态文件、避免日志洪水
    console.log(JSON.stringify(log))
  } catch {
    // 日志本身失败不影响请求
  }
})
