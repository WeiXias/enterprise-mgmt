import { defineEventHandler } from 'h3'
import { db } from '#database'
import { notifications, contracts, paymentPlans, projects, products, opportunities, invoices } from '#schema'
import { eq, and, lte, gte, lt, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async () => {
  const today = new Date().toISOString().slice(0, 10)
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const items: { userId: string; title: string; content: string; type: string; relatedId: string; relatedType: string }[] = []
  const added = new Set<string>()

  const [existingNotifs] = await Promise.all([
    db.select({ key: notifications.type, rid: notifications.relatedId, rt: notifications.relatedType }).from(notifications),
  ])
  const existKeys = new Set(existingNotifs.map(n => `${n.key}:${n.rid}:${n.rt}`))

  function add(userId: string, type: string, title: string, content: string, relatedId: string, relatedType: string) {
    const key = `${type}:${relatedId}:${relatedType}`
    if (existKeys.has(key) || added.has(key)) return
    added.add(key)
    items.push({ userId, title, content, type, relatedId, relatedType })
  }

  // 1. 合同即将到期（7天内，状态非 completed/terminated）
  const expiringContracts = await db.select({
    id: contracts.id, name: contracts.name, endDate: contracts.endDate, createdBy: contracts.createdBy,
  }).from(contracts).where(and(
    gte(contracts.endDate, today),
    lte(contracts.endDate, weekLater),
  ))
  for (const c of expiringContracts) {
    if (c.createdBy) add(c.createdBy, 'remind', '合同即将到期', `合同「${c.name}」将于 ${c.endDate} 到期`, c.id, 'contract')
  }

  // 2. 回款逾期
  const overduePlans = await db.select({
    id: paymentPlans.id, amount: paymentPlans.amount, contractId: paymentPlans.contractId, planDate: paymentPlans.planDate,
  }).from(paymentPlans).where(and(
    lt(paymentPlans.planDate, today),
    eq(paymentPlans.status, 'pending'),
  ))
  for (const p of overduePlans) {
    const contract = await db.select({ name: contracts.name, createdBy: contracts.createdBy }).from(contracts).where(eq(contracts.id, p.contractId)).limit(1)
    const c = contract[0]
    if (c?.createdBy) add(c.createdBy, 'remind', '回款已逾期', `合同「${c.name}」的收款计划 ¥${p.amount}（${p.planDate}）已逾期`, p.id, 'payment_plan')
  }

  // 3. 项目超期
  const overdueProjects = await db.select({
    id: projects.id, name: projects.name, ownerUserId: projects.ownerUserId, endDate: projects.endDate,
  }).from(projects).where(and(lt(projects.endDate, today), isNull(projects.deletedAt)))
  for (const p of overdueProjects) {
    if (p.ownerUserId) add(p.ownerUserId, 'remind', '项目已超期', `项目「${p.name}」已于 ${p.endDate} 到期`, p.id, 'project')
  }

  // 4. 库存不足 (<10)
  const lowStock = await db.select({
    id: products.id, name: products.name, stockQuantity: products.stockQuantity,
  }).from(products).where(lt(products.stockQuantity, 10))
  // 库存不足 → 通知所有 admin
  const admins = await db.select({ id: notifications.userId }).from(notifications).where(eq(notifications.type, 'system')).limit(1) // 兜底
  if (lowStock.length > 0) {
    const adminUsers = await db.all('select id from users where role = \'admin\'') as { id: string }[]
    for (const p of lowStock) {
      for (const a of adminUsers) {
        add(a.id, 'remind', '库存不足', `产品「${p.name}」当前库存仅剩 ${p.stockQuantity}`, p.id, 'product')
      }
    }
  }

  // 5. 发票到期（7天内，status = pending）
  const expiringInvoices = await db.select({
    id: invoices.id, invoiceNo: invoices.invoiceNo, dueDate: invoices.dueDate, createdBy: invoices.createdBy,
  }).from(invoices).where(and(
    gte(invoices.dueDate, today),
    lte(invoices.dueDate, weekLater),
    eq(invoices.status, 'pending'),
  ))
  for (const inv of expiringInvoices) {
    if (inv.createdBy) add(inv.createdBy, 'remind', '发票即将到期', `发票「${inv.invoiceNo}」将于 ${inv.dueDate} 到期`, inv.id, 'invoice')
  }

  // 6. 商机跟进超期（14天无更新）
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const staleOpps = await db.select({
    id: opportunities.id, name: opportunities.name, ownerUserId: opportunities.ownerUserId,
  }).from(opportunities).where(and(lt(opportunities.updatedAt, twoWeeksAgo), isNull(opportunities.deletedAt)))
  for (const o of staleOpps) {
    if (o.ownerUserId) add(o.ownerUserId, 'remind', '商机需要跟进', `商机「${o.name}」已超过 14 天未更新`, o.id, 'opportunity')
  }

  // 批量写入
  if (items.length > 0) {
    await db.insert(notifications).values(
      items.map(n => ({ id: generateId(), ...n, isRead: false }))
    )
  }

  return { code: 0, data: { generated: items.length } }
})
