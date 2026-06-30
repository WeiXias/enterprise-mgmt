import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, suppliers, purchaseOrderItems, products } from '#schema'
import { eq, like, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const status = query.status as string | undefined
  const supplierId = query.supplierId as string | undefined

  const where: any[] = [isNull(purchaseOrders.deletedAt)]
  if (keyword) {
    where.push(like(purchaseOrders.code, `%${keyword}%`))
  }
  if (status) where.push(eq(purchaseOrders.status, status))
  if (supplierId) where.push(eq(purchaseOrders.supplierId, supplierId))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: purchaseOrders.id,
      code: purchaseOrders.code,
      name: purchaseOrders.name,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      expectedDate: purchaseOrders.expectedDate,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      remark: purchaseOrders.remark,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
    }).from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(purchaseOrders.createdAt)),
    db.select({ count: count() }).from(purchaseOrders).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
