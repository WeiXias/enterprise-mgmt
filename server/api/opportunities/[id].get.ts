import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { opportunities, customers, users, opportunityProducts, products, quotes, followUps } from '#schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  // 查询商机基本信息
  const oppResult = await db.select({
    id: opportunities.id,
    name: opportunities.name,
    customerId: opportunities.customerId,
    ownerUserId: opportunities.ownerUserId,
    estimatedAmount: opportunities.estimatedAmount,
    estimatedCloseDate: opportunities.estimatedCloseDate,
    source: opportunities.source,
    competitor: opportunities.competitor,
    status: opportunities.status,
    lostReason: opportunities.lostReason,
    createdAt: opportunities.createdAt,
    updatedAt: opportunities.updatedAt,
  }).from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt))).limit(1)

  if (oppResult.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })

  const o = oppResult[0]

  // 销售成员只能看自己的商机
  if (user.role === 'sales_member' && o!.ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '这个商机你无权查看' })
  }

  const cResult = await db.select({ id: customers.id, name: customers.name, status: customers.status })
    .from(customers).where(eq(customers.id, o!.customerId)).limit(1)
  const customer = cResult[0] || null

  const oResult = await db.select({ id: users.id, name: users.name })
    .from(users).where(eq(users.id, o!.ownerUserId)).limit(1)
  const owner = oResult[0] || null

  const productList = await db.select({
    id: opportunityProducts.id,
    productId: opportunityProducts.productId,
    productName: products.name,
    quantity: opportunityProducts.quantity,
    unitPrice: opportunityProducts.unitPrice,
    discount: opportunityProducts.discount,
  }).from(opportunityProducts)
    .leftJoin(products, eq(opportunityProducts.productId, products.id))
    .where(eq(opportunityProducts.opportunityId, id))

  const quoteList = await db.select({
    id: quotes.id,
    name: quotes.name,
    totalAmount: quotes.totalAmount,
    status: quotes.status,
    validUntil: quotes.validUntil,
    createdAt: quotes.createdAt,
  }).from(quotes).where(and(eq(quotes.opportunityId, id), isNull(quotes.deletedAt))).orderBy(desc(quotes.createdAt))

  const followUpList = await db.select({
    id: followUps.id,
    type: followUps.type,
    content: followUps.content,
    nextFollowUpAt: followUps.nextFollowUpAt,
    userId: followUps.userId,
    createdAt: followUps.createdAt,
  }).from(followUps).where(and(eq(followUps.opportunityId, id), isNull(followUps.deletedAt))).limit(10).orderBy(desc(followUps.createdAt))

  return {
    code: 0,
    data: {
      id: o!.id,
      name: o!.name,
      customer,
      owner,
      estimatedAmount: o!.estimatedAmount,
      estimatedCloseDate: o!.estimatedCloseDate,
      source: o!.source,
      competitor: o!.competitor,
      status: o!.status,
      lostReason: o!.lostReason,
      products: productList,
      quotes: quoteList,
      followUps: followUpList,
      createdAt: o!.createdAt,
      updatedAt: o!.updatedAt,
    }
  }
})
