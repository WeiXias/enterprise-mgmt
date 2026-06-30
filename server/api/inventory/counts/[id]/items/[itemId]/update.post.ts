import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { inventoryCountItems } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  actualQuantity: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id, itemId } = getRouterParams(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const [existing] = await db.select({ id: inventoryCountItems.id }).from(inventoryCountItems)
    .where(and(eq(inventoryCountItems.id, itemId), eq(inventoryCountItems.countId, id), isNull(inventoryCountItems.deletedAt)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '盘点明细不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(inventoryCountItems)
    .set({ actualQuantity: parsed.data.actualQuantity, status: 'counted', updatedAt: now })
    .where(eq(inventoryCountItems.id, itemId))

  return { code: 0, data: null, message: '已录入' }
})
