import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  sort: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  const updates: Record<string, string> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }
  if (parsed.data.name !== undefined) { updates.label = parsed.data.name; updates.value = parsed.data.name }
  if (parsed.data.sort !== undefined) updates.sort = parsed.data.sort

  await db.update(dictEntries).set(updates).where(eq(dictEntries.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'finance', targetId: id, detail: '更新了财务分类' })
  return { code: 0, message: '分类已更新' }
})
