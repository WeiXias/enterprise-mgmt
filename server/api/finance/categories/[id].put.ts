import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { financeCategories } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).optional(),
  sort: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.sort !== undefined) updateData.sort = parsed.data.sort

  const result = await db.update(financeCategories).set(updateData).where(eq(financeCategories.id, id)).returning()
  await logOperation(event, { action: 'UPDATE', module: 'finance', targetId: id, detail: '更新了财务分类' })
  return { code: 0, data: result[0], message: '已保存' }
})
