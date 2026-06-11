import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  autoReviewEnabled: z.boolean().optional(),
  defaultProviderId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const upsertConfig = async (key: string, value: string) => {
    const existing = await db.select({ id: systemConfig.id }).from(systemConfig).where(eq(systemConfig.key, key)).limit(1)
    if (existing.length > 0) {
      await db.update(systemConfig).set({ value, updatedAt: now }).where(eq(systemConfig.key, key))
    } else {
      await db.insert(systemConfig).values({ id: generateId(), key, value, updatedAt: now })
    }
  }

  if (parsed.data.autoReviewEnabled !== undefined) {
    await upsertConfig('ai_auto_review_enabled', parsed.data.autoReviewEnabled ? 'true' : 'false')
  }
  if (parsed.data.defaultProviderId !== undefined) {
    await upsertConfig('ai_default_provider', parsed.data.defaultProviderId || '')
  }

  return { code: 0, data: null, message: 'AI 设置已保存' }
})
