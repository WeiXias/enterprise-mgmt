import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { requireAuth } from '#server-utils/permission'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({ value: z.string() })

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { key } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const existing = await db.select({ id: systemConfig.id }).from(systemConfig).where(eq(systemConfig.key, key)).limit(1)
  if (existing.length > 0) {
    await db.update(systemConfig).set({ value: parsed.data.value, updatedAt: now }).where(eq(systemConfig.key, key))
  } else {
    await db.insert(systemConfig).values({ id: generateId(), key, value: parsed.data.value, updatedAt: now })
  }
  return { code: 0, data: null, message: '配置已更新' }
})
