import { defineEventHandler, createError, getHeader } from 'h3'

// Simple in-memory rate limiter. Restart clears state.
// For production with multiple instances, swap for Redis-backed limiter.

interface Bucket {
  count: number
  resetAt: number
}

const buckets: Record<string, Bucket> = {}

function getKey(ip: string, route: string): string {
  return `${ip}:${route}`
}

function isExpired(bucket: Bucket): boolean {
  return Date.now() > bucket.resetAt
}

const WINDOW_MS = 60_000 // 1 minute

// config[route] = max requests per window
const LIMITS: Record<string, number> = {
  '/api/auth/login': 10,
  '/api/auth/register': 5,
  '/api/auth/refresh': 30,
  DEFAULT: 120,
}

/**
 * Rate-limit middleware. Runs before auth middleware.
 */

// Periodic cleanup: remove expired buckets every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const key of Object.keys(buckets)) {
    if (buckets[key].resetAt <= now) delete buckets[key]
  }
}, CLEANUP_INTERVAL_MS)
export default defineEventHandler((event) => {
  const url = event.path || ''
  if (!url.startsWith('/api/')) return

  const ip = getHeader(event, 'x-forwarded-for')
    || getHeader(event, 'x-real-ip')
    || event.node?.req?.socket?.remoteAddress
    || '127.0.0.1'

  const max = LIMITS[url] ?? LIMITS.DEFAULT
  const key = getKey(ip, url)
  let bucket = buckets[key]

  if (!bucket || isExpired(bucket)) {
    bucket = buckets[key] = { count: 0, resetAt: Date.now() + WINDOW_MS }
  }

  bucket.count++

  setHeader(event, 'X-RateLimit-Limit', String(max))
  setHeader(event, 'X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
  setHeader(event, 'X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

  if (bucket.count > max) {
    throw createError({ statusCode: 429, statusMessage: '请求太频繁了，歇会儿再试' })
  }
})
