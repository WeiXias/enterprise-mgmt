import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { financeSettings } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const bodySchema = z.record(z.string(), z.unknown())

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '数据格式不对' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  for (const [key, val] of Object.entries(parsed.data)) {
    const value = typeof val === 'object' ? JSON.stringify(val) : String(val)
    const existing = await db.select({ id: financeSettings.id }).from(financeSettings).where(eq(financeSettings.key, key)).limit(1)
    if (existing.length > 0) {
      await db.update(financeSettings).set({ value, updatedAt: now }).where(eq(financeSettings.id, existing[0].id))
    } else {
      await db.insert(financeSettings).values({ id: generateId(), key, value, updatedAt: now })
    }
  }

  await logOperation(event, { action: 'UPDATE', module: 'finance', targetId: 'settings', detail: '保存了财务设置' })
  return { code: 0, data: null, message: '设置已保存' }
})
