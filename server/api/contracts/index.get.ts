import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, users, suppliers } from '#schema'
import { eq, like, and, isNull, count, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const status = query.status as string | undefined
  const customerId = query.customerId as string | undefined
  const ownerId = query.ownerId as string | undefined
  const supplierId = query.supplierId as string | undefined
  const type = query.type as string | undefined

  const where: any[] = [isNull(contracts.deletedAt)]
  if (keyword) {
    where.push(
      like(contracts.name, `%${keyword}%`)
    )
  }
  if (status) where.push(eq(contracts.status, status))
  if (customerId) where.push(eq(contracts.customerId, customerId))
  if (ownerId) where.push(eq(contracts.ownerUserId, ownerId))
  if (supplierId) where.push(eq(contracts.supplierId, supplierId))
  if (type) where.push(eq(contracts.type, type))

  // 销售成员只能看归属为自己的合同
  if (user.role === 'sales_member') {
    where.push(eq(contracts.ownerUserId, user.userId))
  }

  const [list, totalResult] = await Promise.all([
    db.select({
      id: contracts.id, code: contracts.code, name: contracts.name,
      totalAmount: contracts.totalAmount,
      status: contracts.status, startDate: contracts.startDate, endDate: contracts.endDate,
      type: contracts.type, direction: contracts.direction,
      customerId: contracts.customerId, customerName: customers.name,
      supplierId: contracts.supplierId, supplierName: suppliers.name,
      ownerUserId: contracts.ownerUserId, ownerName: users.name,
      createdAt: contracts.createdAt,
    }).from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(suppliers, eq(contracts.supplierId, suppliers.id))
      .leftJoin(users, eq(contracts.ownerUserId, users.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(contracts.updatedAt)),
    db.select({ count: count() }).from(contracts).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((c: any) => ({
        ...c,
        customer: { id: c.customerId, name: c.customerName },
        supplier: { id: c.supplierId, name: c.supplierName },
        owner: { id: c.ownerUserId, name: c.ownerName },
        customerId: undefined,
        customerName: undefined,
        supplierId: undefined,
        supplierName: undefined,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
