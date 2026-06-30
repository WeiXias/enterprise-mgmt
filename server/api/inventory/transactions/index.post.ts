import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products } from '#schema'
import { generateId } from '#server-utils/id'
import { eq, and, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const { productId, type, quantity, unitPrice, contractId, projectId, batchNo, remark } = body || {}
  if (!productId || !type || !quantity) throw createError({ statusCode: 422, statusMessage: '产品、类型和数量不能为空' })
  if (!['inbound', 'outbound', 'adjustment'].includes(type)) throw createError({ statusCode: 422, statusMessage: '类型不合法' })

  const [product] = await db.select({ id: products.id, stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, productId)).limit(1)
  if (!product) throw createError({ statusCode: 404, statusMessage: '产品不存在' })

  const delta = type === 'inbound' ? Math.abs(quantity) : type === 'outbound' ? -Math.abs(quantity) : quantity

  // 原子操作：在 UPDATE 语句中直接检查库存，避免并发竞态
  const stockResult = await db.update(products).set({
    stockQuantity: sql`stock_quantity + ${delta}`,
    updatedAt: sql`(datetime('now'))`,
  }).where(and(
    eq(products.id, productId),
    type === 'outbound' ? sql`stock_quantity >= ${Math.abs(delta)}` : undefined,
  ))

  if (stockResult.changes === 0) {
    // 重新检查是产品不存在还是库存不足
    const [recheck] = await db.select({ stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, productId)).limit(1)
    if (!recheck) throw createError({ statusCode: 404, statusMessage: '产品不存在' })
    throw createError({ statusCode: 422, statusMessage: `库存不足（当前库存 ${recheck.stockQuantity}）` })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const transactionId = generateId()
  await db.insert(inventoryTransactions).values({
    id: transactionId,
    productId,
    type,
    quantity: delta,
    unitPrice: unitPrice || 0,
    batchNo: batchNo || null,
    remark: remark || null,
    operatorId: user.userId,
    createdAt: now,
  })

  return { code: 0, data: { id: transactionId }, message: '搞定了！库存已更新' }
})
