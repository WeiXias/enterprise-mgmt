import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const bodySchema = z.record(z.string(), z.unknown())

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '请求格式不对' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith('smtp_')) continue
    const existing = await db.select({ id: systemConfig.id }).from(systemConfig).where(eq(systemConfig.key, key)).limit(1)
    if (existing.length > 0) {
      await db.update(systemConfig).set({ value: String(value), updatedAt: now }).where(eq(systemConfig.key, key))
    } else {
      await db.insert(systemConfig).values({ id: generateId(), key, value: String(value), updatedAt: now })
    }
  }

  return { code: 0, data: null, message: 'SMTP 配置已保存' }
})
