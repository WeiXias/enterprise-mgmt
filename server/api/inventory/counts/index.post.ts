import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts, inventoryCountItems } from '#schema'
import { products } from '#schema/products'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'
import { isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  code: z.string().max(100).optional(),
  warehouseId: z.string().optional().or(z.literal('')),
  plannedDate: z.string().optional().or(z.literal('')),
  remark: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const code = parsed.data.code || `PD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(0, 6)}`

  // 快照产品库存到明细行
  const productList = await db.select({
    id: products.id,
    name: products.name,
    code: products.code,
    stockQuantity: products.stockQuantity,
  }).from(products).where(isNull(products.deletedAt))

  await db.transaction(async (tx) => {
    await tx.insert(inventoryCounts).values({
      id,
      code,
      warehouseId: parsed.data.warehouseId || null,
      status: 'draft',
      plannedDate: parsed.data.plannedDate || null,
      remark: parsed.data.remark || null,
      createdBy: user.userId,
    })

    if (productList.length > 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      await tx.insert(inventoryCountItems).values(
        productList.map(p => ({
          id: generateId(),
          countId: id,
          productId: p.id,
          systemQuantity: p.stockQuantity ?? 0,
          status: 'pending',
          createdBy: user.userId,
          createdAt: now,
          updatedAt: now,
        }))
      )
    }
  })

  await logOperation(event, { action: 'CREATE', module: 'product', targetId: id, detail: `创建了盘点计划「${code}」` })
  return { code: 0, data: { id }, message: '盘点计划已创建' }
})
