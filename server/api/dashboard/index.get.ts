import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, opportunities, contracts, payments, products, inventoryTransactions, paymentPlans, reimbursements, commissionPayouts, financeTransactions } from '#schema'
import { invoices } from '#schema/invoices'
import { commissions } from '#schema/commissions'
import { purchaseOrders } from '#schema/purchase-orders'
import { suppliers } from '#schema/suppliers'
import { followUps } from '#schema/customers'
import { tasks } from '#schema/projects'
import { eq, and, isNull, sql, gte, lte, isNotNull, ne, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'dashboard:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const isSalesMember = user.role === 'sales_member'

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'
  const thirtyDaysLater = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const oppOwnerWhere = isSalesMember ? eq(opportunities.ownerUserId, user.userId) : undefined

  const [
    // 现有 KPI
    customerCount, oppCount, contractThisMonth, receivedThisMonth, followUpCount, taskCount, expiringCount,
    newCustomerThisMonth, newOppThisMonth, oppTotalAmount,
    contractClosedThisMonth,
    pendingCollection, invoicedUnpaid, invoicedPaid,
    commissionTotal, commissionUnpaid, commissionPaid,

    // 客户扩展
    customerByStatus, customerByIndustry, customerClosedCount, customerPotentialCount,

    // 合同扩展
    contractByStatus, totalReceivedResult, totalInvoicedResult, recentContracts, expiringContractsList,

    // 财务扩展
    incomeByPayments, incomeByManual, expenseByPayouts, expenseByManual,
    overdueResult, pendingReimbCount, recentPaymentsList, recentManualList,

    // 进销存扩展
    productKinds, totalStockResult, lowStockCount, recentPurchaseOrdersList,
  ] = await Promise.all([
    // 现有 KPI (0-17)
    db.select({ count: sql<number>`count(*)` }).from(customers).where(isNull(customers.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(and(isNull(opportunities.deletedAt), ne(opportunities.status, 'closed_won'), ne(opportunities.status, 'closed_lost'), oppOwnerWhere)),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(and(isNull(contracts.deletedAt), gte(contracts.createdAt, monthStart))),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments).where(gte(payments.paymentDate, monthStart)),
    db.select({ count: sql<number>`count(*)` }).from(followUps).where(lte(followUps.nextFollowUpAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.status, 'todo'), isNotNull(tasks.endDate))),
    db.select({ count: sql<number>`count(*)` }).from(contracts).where(and(isNull(contracts.deletedAt), isNotNull(contracts.endDate), gte(contracts.endDate, today), lte(contracts.endDate, thirtyDaysLater))),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(and(isNull(customers.deletedAt), gte(customers.createdAt, monthStart))),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(and(isNull(opportunities.deletedAt), gte(opportunities.createdAt, monthStart), oppOwnerWhere)),
    db.select({ total: sql<number>`coalesce(sum(estimated_amount), 0)` }).from(opportunities).where(and(isNull(opportunities.deletedAt), ne(opportunities.status, 'closed_lost'), oppOwnerWhere)),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(and(isNull(contracts.deletedAt), eq(contracts.status, 'completed'), gte(contracts.updatedAt, monthStart))),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments),
    db.select({ total: sql<number>`coalesce(sum(invoices.amount), 0)` }).from(invoices).where(and(eq(invoices.status, 'issued'), eq(sql`(select count(*) from payments where payments.contract_id = invoices.contract_id)`, 0))),
    db.select({ total: sql<number>`coalesce(sum(invoices.amount), 0)` }).from(invoices).where(and(eq(invoices.status, 'issued'), sql`(select count(*) from payments where payments.contract_id = invoices.contract_id) > 0`)),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'approved')),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'pending')),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'paid')),

    // 客户扩展 (18-22)
    db.select({ status: customers.status, count: sql<number>`count(*)` }).from(customers).where(isNull(customers.deletedAt)).groupBy(customers.status),
    db.select({ industry: customers.industry, count: sql<number>`count(*)` }).from(customers).where(and(isNull(customers.deletedAt), ne(customers.industry, ''))).groupBy(customers.industry),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.status, 'closed'))),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(and(isNull(customers.deletedAt), eq(customers.status, 'potential'))),

    // 合同扩展 (23-27)
    db.select({ status: contracts.status, count: sql<number>`count(*)` }).from(contracts).where(isNull(contracts.deletedAt)).groupBy(contracts.status),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(invoices).where(eq(invoices.status, 'issued')),
    db.select({ id: contracts.id, name: contracts.name, code: contracts.code, totalAmount: contracts.totalAmount, status: contracts.status, customerName: customers.name }).from(contracts).leftJoin(customers, eq(contracts.customerId, customers.id)).where(isNull(contracts.deletedAt)).orderBy(desc(contracts.updatedAt)).limit(5),
    db.select({ id: contracts.id, name: contracts.name, endDate: contracts.endDate, customerName: customers.name }).from(contracts).leftJoin(customers, eq(contracts.customerId, customers.id)).where(and(isNull(contracts.deletedAt), eq(contracts.status, 'in_progress'), isNotNull(contracts.endDate), gte(contracts.endDate, today), lte(contracts.endDate, thirtyDaysLater))).orderBy(sql`${contracts.endDate} asc`).limit(5),

    // 财务扩展 (28-35) - 复用 finance overview 的查询方式
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financeTransactions).where(and(isNull(financeTransactions.deletedAt), eq(financeTransactions.type, 'income'))),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(commissionPayouts).where(eq(commissionPayouts.status, 'confirmed')),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(financeTransactions).where(and(isNull(financeTransactions.deletedAt), eq(financeTransactions.type, 'expense'))),
    db.select({ count: sql<number>`count(*)` }).from(paymentPlans).where(and(eq(paymentPlans.status, 'pending'), lte(paymentPlans.planDate, today))),
    db.select({ count: sql<number>`count(*)` }).from(reimbursements).where(eq(reimbursements.status, 'pending')),
    db.select({ id: payments.id, amount: payments.amount, createdAt: payments.createdAt }).from(payments).orderBy(desc(payments.createdAt)).limit(5),
    db.select({ id: financeTransactions.id, type: financeTransactions.type, amount: financeTransactions.amount, description: financeTransactions.description, category: financeTransactions.category, transactionDate: financeTransactions.transactionDate, createdAt: financeTransactions.createdAt }).from(financeTransactions).where(isNull(financeTransactions.deletedAt)).orderBy(desc(financeTransactions.createdAt)).limit(10),

    // 进销存扩展 (36-39)
    db.select({ count: sql<number>`count(distinct ${products.id})` }).from(products).where(isNull(products.deletedAt)),
    db.select({ total: sql<number>`coalesce(sum(${inventoryTransactions.quantity}), 0)` }).from(inventoryTransactions),
    db.select({ count: sql<number>`count(distinct ${products.id})` }).from(products).where(and(isNull(products.deletedAt), lte(products.stockQuantity, 10), ne(products.stockQuantity, 0))),
    db.select({ id: purchaseOrders.id, code: purchaseOrders.code, status: purchaseOrders.status, totalAmount: purchaseOrders.totalAmount, supplierName: suppliers.name }).from(purchaseOrders).leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(isNull(purchaseOrders.deletedAt)).orderBy(desc(purchaseOrders.createdAt)).limit(5),
  ])

  const [recentCustomers, recentOpps, funnelRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, status: customers.status, industry: customers.industry, createdAt: customers.createdAt }).from(customers).where(isNull(customers.deletedAt)).orderBy(desc(customers.createdAt)).limit(5),
    db.select({ id: opportunities.id, name: opportunities.name, customerName: customers.name, amount: opportunities.estimatedAmount, status: opportunities.status }).from(opportunities).leftJoin(customers, eq(opportunities.customerId, customers.id)).where(and(isNull(opportunities.deletedAt), ne(opportunities.status, 'closed_won'), ne(opportunities.status, 'closed_lost'), oppOwnerWhere)).orderBy(desc(opportunities.createdAt)).limit(5),
    db.select({ status: opportunities.status, count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(estimated_amount), 0)` }).from(opportunities).where(and(isNull(opportunities.deletedAt), oppOwnerWhere)).groupBy(opportunities.status),
  ])

  const funnelTotal = funnelRows.reduce((sum: number, r: any) => sum + Number(r.count), 0)

  const [totalInvoicedAmount, contractTotalAmount] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(invoices).where(eq(invoices.status, 'issued')),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(isNull(contracts.deletedAt)),
  ])

  // 合同数据
  const cStatusMap: Record<string, number> = {}
  for (const r of contractByStatus) { cStatusMap[r.status as string] = Number(r.count) }
  const cTotal = (cStatusMap['draft']||0) + (cStatusMap['approved']||0) + (cStatusMap['in_progress']||0) + (cStatusMap['completed']||0) + (cStatusMap['terminated']||0)

  // 财务数据
  const totalIncome = Number(incomeByPayments[0]?.total || 0) + Number(incomeByManual[0]?.total || 0)
  const totalExpense = Number(expenseByPayouts[0]?.total || 0) + Number(expenseByManual[0]?.total || 0)
  const totalReceived = Number(totalReceivedResult[0]?.total || 0)
  const totalInvoiced = Number(totalInvoicedResult[0]?.total || 0)

  // 最近流水：合并 payments + manual transactions，按日期排序取前 10
  const recentTransactions = [
    ...recentPaymentsList.map((r: any) => ({ id: r.id, type: 'income', amount: r.amount, description: '合同收款', category: '合同收款', transactionDate: (r.createdAt || '').slice(0, 10) })),
    ...recentManualList.map((r: any) => ({ id: r.id, type: r.type, amount: r.amount, description: r.description, category: r.category, transactionDate: r.transactionDate })),
  ].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 10)

  return {
    code: 0,
    data: {
      kpi: {
        customerTotal: Number(customerCount[0]?.count || 0),
        opportunityInProgress: Number(oppCount[0]?.count || 0),
        contractAmountThisMonth: Number(contractThisMonth[0]?.total || 0),
        receivedAmountThisMonth: Number(receivedThisMonth[0]?.total || 0),
        newCustomersThisMonth: Number(newCustomerThisMonth[0]?.count || 0),
        newOppsThisMonth: Number(newOppThisMonth[0]?.count || 0),
        oppTotalAmount: Number(oppTotalAmount[0]?.total || 0),
        contractClosedThisMonth: Number(contractClosedThisMonth[0]?.total || 0),
        totalCollection: Number(pendingCollection[0]?.total || 0),
        invoicedUnpaid: Number(invoicedUnpaid[0]?.total || 0),
        invoicedPaid: Number(invoicedPaid[0]?.total || 0),
        commissionTotal: Number(commissionTotal[0]?.total || 0),
        commissionUnpaid: Number(commissionUnpaid[0]?.total || 0),
        commissionPaid: Number(commissionPaid[0]?.total || 0),
      },
      todayReminders: {
        followUps: Number(followUpCount[0]?.count || 0),
        expiringContracts: Number(expiringCount[0]?.count || 0),
        dueTasks: Number(taskCount[0]?.count || 0),
      },
      recentCustomers,
      recentOpportunities: recentOpps,
      funnelData: { stages: funnelRows, total: funnelTotal },

      customerStats: {
        total: Number(customerCount[0]?.count || 0),
        newThisMonth: Number(newCustomerThisMonth[0]?.count || 0),
        closedCount: Number(customerClosedCount[0]?.count || 0),
        potentialCount: Number(customerPotentialCount[0]?.count || 0),
        byStatus: customerByStatus.map((r: any) => ({ status: r.status, count: Number(r.count) })),
        byIndustry: customerByIndustry.map((r: any) => ({ industry: r.industry, count: Number(r.count) })),
      },

      contractStats: {
        total: cTotal,
        draft: cStatusMap['draft'] || 0, approved: cStatusMap['approved'] || 0,
        inProgress: cStatusMap['in_progress'] || 0, completed: cStatusMap['completed'] || 0,
        terminated: cStatusMap['terminated'] || 0,
        receivedAmount: totalReceived,
        unreceivedAmount: totalInvoiced > totalReceived ? totalInvoiced - totalReceived : 0,
        overdueAmount: 0,
      },
      recentContracts: recentContracts.map((r: any) => ({ id: r.id, name: r.name, code: r.code, totalAmount: r.totalAmount, status: r.status, customerName: r.customerName })),
      expiringContracts: expiringContractsList.map((r: any) => ({ id: r.id, name: r.name, endDate: r.endDate, customerName: r.customerName })),

      // 顶部总额概览
      summaryAmounts: {
        oppTotal: Number(oppTotalAmount[0]?.total || 0),
        contractTotal: Number(contractTotalAmount[0]?.total || 0),
        invoicedTotal: Number(totalInvoicedAmount[0]?.total || 0),
        receivedTotal: totalReceived,
        unpaidTotal: totalInvoiced > totalReceived ? totalInvoiced - totalReceived : 0,
      },

      financeStats: {
        totalIncome, totalExpense,
        netBalance: totalIncome - totalExpense,
        overduePaymentCount: Number(overdueResult[0]?.count || 0),
        pendingReimbursementCount: Number(pendingReimbCount[0]?.count || 0),
      },
      recentTransactions,

      inventoryStats: {
        productKinds: Number(productKinds[0]?.count || 0),
        totalStock: Number(totalStockResult[0]?.total || 0),
        lowStockCount: Number(lowStockCount[0]?.count || 0),
      },
      recentPurchaseOrders: recentPurchaseOrdersList.map((r: any) => ({ id: r.id, code: r.code, status: r.status, totalAmount: r.totalAmount, supplierName: r.supplierName })),
    }
  }
})
