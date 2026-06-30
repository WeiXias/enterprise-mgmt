import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, contractProducts, paymentPlans, payments, contractAttachments, projects, users } from '#schema'
import { products } from '#schema/products'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const result = await db.select().from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = result[0]

  // 销售成员只能看自己的合同
  if (user.role === 'sales_member' && c!.createdBy !== user.userId && c.ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '这个合同你无权查看' })
  }

  const [customerResult, productList, planList, paymentList, attachmentList, projectList, approverResult, creatorResult, ownerResult] = await Promise.all([
    db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, c!.customerId)).limit(1),
    db.select({
      id: contractProducts.id, productId: contractProducts.productId,
      quantity: contractProducts.quantity, unitPrice: contractProducts.unitPrice,
      discount: contractProducts.discount, productName: products.name, productCode: products.code,
    }).from(contractProducts)
      .leftJoin(products, eq(contractProducts.productId, products.id))
      .where(eq(contractProducts.contractId, id)),
    db.select().from(paymentPlans).where(eq(paymentPlans.contractId, id)),
    db.select().from(payments).where(eq(payments.contractId, id)),
    db.select().from(contractAttachments).where(eq(contractAttachments.contractId, id)),
    db.select({ id: projects.id, name: projects.name, status: projects.status }).from(projects)
      .where(and(eq(projects.contractId, id), isNull(projects.deletedAt))),
    c!.approvedBy ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.approvedBy)).limit(1) : Promise.resolve([]),
    c!.createdBy ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.createdBy)).limit(1) : Promise.resolve([]),
    c!.ownerUserId ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.ownerUserId)).limit(1) : Promise.resolve([]),
  ])

  // Calculate received amount from payments
  const receivedAmount = paymentList.reduce((sum: number, p: any) => sum + Number(p.amount), 0)

  return {
    code: 0,
    data: {
      id: c!.id, code: c.code, name: c.name,
      customer: customerResult[0] || null,
      opportunityId: c!.opportunityId,
      totalAmount: c!.totalAmount, receivedAmount,
      partyA: c!.partyA, partyB: c.partyB,
      paymentMethod: c!.paymentMethod,
      startDate: c!.startDate, endDate: c.endDate,
      status: c!.status, remark: c.remark,
      rejectReason: c!.rejectReason,
      approvedBy: approverResult[0] || null,
      approvedAt: c!.approvedAt,
      createdBy: creatorResult[0] || null,
      owner: ownerResult[0] || null,
      version: c!.version,
      products: productList,
      paymentPlans: planList,
      payments: paymentList,
      attachments: attachmentList,
      projects: projectList,
      content: c!.content || null,
      createdAt: c!.createdAt, updatedAt: c.updatedAt,
    }
  }
})
