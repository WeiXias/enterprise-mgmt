import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, users, suppliers, payments } from '#schema'
import { eq, like, and, isNull, count, desc, sum, inArray } from 'drizzle-orm'
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

  // 按合同聚合已收金额
  let paidMap = new Map<string, number>()
  if (list.length > 0) {
    const contractIds = list.map(c => c.id)
    const paymentAgg = await db.select({
      contractId: payments.contractId,
      totalReceived: sum(payments.amount),
    }).from(payments)
      .where(inArray(payments.contractId, contractIds))
      .groupBy(payments.contractId)
    paidMap = new Map(paymentAgg.map(p => [p.contractId, Number(p.totalReceived)]))
  }

  return {
    code: 0,
    data: {
      items: list.map((c: any) => {
        const totalAmt = Number(c.totalAmount)
        const receivedAmount = paidMap.get(c.id) || 0
        return {
          ...c,
          customer: { id: c.customerId, name: c.customerName },
          supplier: { id: c.supplierId, name: c.supplierName },
          owner: { id: c.ownerUserId, name: c.ownerName },
          customerId: undefined,
          customerName: undefined,
          supplierId: undefined,
          supplierName: undefined,
          receivedAmount,
          unreceivedAmount: totalAmt - receivedAmount,
          paymentProgress: totalAmt > 0 ? Math.round((receivedAmount / totalAmt) * 10000) / 100 : 0,
        }
      }),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
