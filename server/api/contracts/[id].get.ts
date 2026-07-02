import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, contractProducts, paymentPlans, payments, contractAttachments, projects, users } from '#schema'
import { products, productCategories } from '#schema/products'
import { invoices } from '#schema/invoices'
import { purchaseOrders, suppliers } from '#schema'
import { eq, and, isNull, ne } from 'drizzle-orm'
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
  if (user.role === 'sales_member' && c!.createdBy !== user.userId && c!.ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '这个合同你无权查看' })
  }

  const [customerResult, productList, planList, paymentList, attachmentList, projectList, approverResult, creatorResult, ownerResult, invoiceList, relatedPurchaseOrders, relatedContracts] = await Promise.all([
    db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, c!.customerId)).limit(1).catch(() => []),
    db.select({
      id: contractProducts.id, productId: contractProducts.productId,
      quantity: contractProducts.quantity, unitPrice: contractProducts.unitPrice,
      discount: contractProducts.discount,
      productName: products.name, productCode: products.code,
      categoryId: products.categoryId, categoryName: productCategories.name,
      taxRate: products.taxRate,
    }).from(contractProducts)
      .leftJoin(products, eq(contractProducts.productId, products.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(contractProducts.contractId, id)).catch(() => []),
    db.select().from(paymentPlans).where(eq(paymentPlans.contractId, id)).catch(() => []),
    db.select().from(payments).where(eq(payments.contractId, id)).catch(() => []),
    db.select().from(contractAttachments).where(eq(contractAttachments.contractId, id)).catch(() => []),
    db.select({ id: projects.id, name: projects.name, status: projects.status }).from(projects)
      .where(and(eq(projects.contractId, id), isNull(projects.deletedAt))).catch(() => []),
    c!.approvedBy ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.approvedBy)).limit(1).catch(() => []) : Promise.resolve([]),
    c!.createdBy ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.createdBy)).limit(1).catch(() => []) : Promise.resolve([]),
    c!.ownerUserId ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c.ownerUserId)).limit(1).catch(() => []) : Promise.resolve([]),
    // 关联发票
    db.select({
      id: invoices.id, invoiceNo: invoices.invoiceNo, type: invoices.type,
      amount: invoices.amount, taxRate: invoices.taxRate, taxAmount: invoices.taxAmount,
      status: invoices.status, issuedAt: invoices.issuedAt,
    }).from(invoices).where(eq(invoices.contractId, id)).catch(() => []),
    // 关联采购订单（通过 contractId 匹配）
    db.select({
      id: purchaseOrders.id, code: purchaseOrders.code,
      supplierName: suppliers.name,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      expectedDate: purchaseOrders.expectedDate,
    }).from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(eq(purchaseOrders.contractId, id), isNull(purchaseOrders.deletedAt)))
      .limit(10).catch(() => []),
    // 关联销售合同（同客户，排除自身）
    c!.customerId ? db.select({
      id: contracts.id, name: contracts.name, code: contracts.code,
      totalAmount: contracts.totalAmount, status: contracts.status,
      customerName: customers.name,
    }).from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .where(and(eq(contracts.customerId, c!.customerId), ne(contracts.id, id), isNull(contracts.deletedAt)))
      .limit(10).catch(() => []) : Promise.resolve([]),
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
      signedAt: c!.signedAt,
      status: c!.status, remark: c.remark,
      rejectReason: c!.rejectReason,
      approvedBy: approverResult[0] || null,
      approvedAt: c!.approvedAt,
      createdBy: creatorResult[0] || null,
      supplierId: c!.supplierId,
      owner: ownerResult[0] || null,
      version: c!.version,
      products: productList,
      paymentPlans: planList,
      payments: paymentList,
      invoices: invoiceList,
      attachments: attachmentList,
      projects: projectList,
      relatedPurchaseOrders,
      relatedContracts,
      content: c!.content || null,
      createdAt: c!.createdAt, updatedAt: c.updatedAt,
    }
  }
})
