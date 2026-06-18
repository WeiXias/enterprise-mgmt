import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull, sql, inArray } from 'drizzle-orm'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'
import { requireTransition } from '../../server/utils/workflow'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let customerId: string
let productId: string

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists customers (id text primary key, name text not null, industry text, registered_address text, office_address text, owner_user_id text references users(id), status text not null default 'potential', remark text, lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists products (id text primary key, name text not null, code text not null unique, category_id text, unit text, standard_price integer not null default 0, cost_price integer not null default 0, stock_quantity integer not null default 0, description text, status text not null default 'on_sale', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists product_categories (id text primary key, name text not null, sort text not null default '0', created_at text not null default (datetime('now')))`,
    `create table if not exists contracts (id text primary key, code text not null unique, name text not null, customer_id text not null references customers(id), opportunity_id text, party_a text not null, party_b text not null, total_amount integer not null default 0, payment_method text, start_date text, end_date text, status text not null default 'draft', reject_reason text, approved_by text references users(id), approved_at text, owner_user_id text references users(id), created_by text not null references users(id), remark text, content text, supplier_id text, version integer not null default 1, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists subcontracts (id text primary key, code text, name text not null, parent_contract_id text not null references contracts(id), subcontract_party_id text, total_amount integer not null default 0, tax_rate real default 0.05, service_fee integer default 0, status text not null default 'draft', start_date text, end_date text, remark text, created_by text not null references users(id), created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists contract_products (id text primary key, contract_id text not null references contracts(id), product_id text not null references products(id), quantity integer not null default 1, unit_price integer not null default 0, discount real not null default 1)`,
    `create table if not exists payment_plans (id text primary key, contract_id text not null references contracts(id), amount integer not null default 0, plan_date text not null, remark text, status text not null default 'pending', created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists payments (id text primary key, contract_id text not null references contracts(id), payment_plan_id text references payment_plans(id), amount integer not null default 0, payment_date text not null, payment_method text, remark text, created_by text not null references users(id), type text not null default 'normal', customer_id text, reconciled_at text, reconciled_by_id text references users(id), remaining_amount integer, refunded_at text, refund_transaction_id text, created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists projects (id text primary key, name text not null, contract_id text references contracts(id), owner_user_id text not null references users(id), start_date text, end_date text, budget integer not null default 0, status text not null default 'not_started', remark text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists project_members (id text primary key, project_id text not null references projects(id), user_id text not null references users(id), role text not null default 'member')`,
    `create table if not exists commission_rules (id text primary key, name text not null, base_type text not null default 'payment_amount', product_id text references products(id), min_amount integer not null default 0, max_amount integer, rate real not null default 0, is_active text not null default 'yes', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')))`,
    `create table if not exists commissions (id text primary key, user_id text not null references users(id), contract_id text not null references contracts(id), payment_id text, rule_id text references commission_rules(id), base_amount integer not null default 0, rate real not null default 0, amount integer not null default 0, status text not null default 'pending', adjust_amount integer default 0, adjust_reason text, approved_by text references users(id), approved_at text, period_month text not null, remark text, created_at text not null default (datetime('now')), deleted_at text)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  customerId = generateId()
  productId = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(schema.users).values({ id: adminId, username: 'tester', password: 'hash', name: '测试员', role: 'admin', status: 'active' })
  await db.insert(schema.customers).values({ id: customerId, name: '测试客户', ownerUserId: adminId })
  await db.insert(schema.products).values({ id: productId, name: '咨询服务', code: 'P-CONSULT', standardPrice: 100000, stockQuantity: 100 })
  await db.insert(schema.products).values({ id: generateId(), name: '软件产品', code: 'P-SOFT', standardPrice: 200000, stockQuantity: 50 })
  await db.insert(schema.commissionRules).values({
    id: generateId(), name: '合同金额提成', baseType: 'contract_amount', rate: 0.05, isActive: 'yes',
  })
  await db.insert(schema.commissionRules).values({
    id: generateId(), name: '回款金额提成', baseType: 'payment_amount', rate: 0.10, isActive: 'yes',
  })
}

describe('合同全生命周期', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  it('1. 创建合同（draft 状态）', async () => {
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-TEST`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '端到端测试合同', customerId,
      partyA: '甲方公司', partyB: '乙方公司', totalAmount: 100000,
      startDate: '2026-06-01', endDate: '2026-12-31',
      status: 'draft', ownerUserId: adminId, createdBy: adminId,
    })
    const [row] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId)).limit(1)
    expect(row).toBeDefined()
    expect(row!.status).toBe('draft')
    expect(row!.totalAmount).toBe(100000)
  })

  it('2. 创建合同时可同时添加产品和付款计划', async () => {
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-P2`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '带产品合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 50000,
      status: 'draft', ownerUserId: adminId, createdBy: adminId,
    })
    // 关联产品
    await db.insert(schema.contractProducts).values({
      id: generateId(), contractId, productId, quantity: 2, unitPrice: 25000, discount: 1.0,
    })
    // 付款计划
    await db.insert(schema.paymentPlans).values([
      { id: generateId(), contractId, amount: 25000, planDate: '2026-07-01', status: 'pending' },
      { id: generateId(), contractId, amount: 25000, planDate: '2026-10-01', status: 'pending' },
    ])
    const products = await db.select().from(schema.contractProducts).where(eq(schema.contractProducts.contractId, contractId))
    const plans = await db.select().from(schema.paymentPlans).where(eq(schema.paymentPlans.contractId, contractId))
    expect(products).toHaveLength(1)
    expect(plans).toHaveLength(2)
  })

  it('3. 状态机校验：draft → approved 合法', () => {
    expect(() => requireTransition('contracts', 'draft', 'approved')).not.toThrow()
  })

  it('4. 状态机校验：draft → completed 非法（跳过审批）', () => {
    expect(() => requireTransition('contracts', 'draft', 'completed')).toThrow('不能变更为')
  })

  it('5. 状态机校验：completed → in_progress 非法（终态不可逆转）', () => {
    expect(() => requireTransition('contracts', 'completed', 'in_progress')).toThrow('不能变更为')
  })

  it('6. 审批通过合同', async () => {
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-APRV`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '待审批合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 80000,
      status: 'draft', ownerUserId: adminId, createdBy: adminId,
    })
    // 模拟审批：更新状态
    await db.update(schema.contracts).set({
      status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }).where(eq(schema.contracts.id, contractId))
    const [row] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId)).limit(1)
    expect(row!.status).toBe('approved')
    expect(row!.approvedBy).toBe(adminId)
  })

  it('7. 合同→项目转换（字段正确性）', async () => {
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-2PRJ`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '转项目合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 150000,
      status: 'approved', ownerUserId: adminId, createdBy: adminId,
    })
    const projectId = generateId()
    await db.insert(schema.projects).values({
      id: projectId, name: '转项目合同', contractId,
      ownerUserId: adminId, status: 'not_started', budget: 150000,
    })
    // 加项目成员，role 应为 leader
    await db.insert(schema.projectMembers).values({
      id: generateId(), projectId, userId: adminId, role: 'leader',
    })
    const [proj] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1)
    const [member] = await db.select().from(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId)).limit(1)
    expect(proj!.ownerUserId).toBe(adminId) // 不是 ownerId
    expect(member!.role).toBe('leader')     // 不是 owner
  })

  it('8. 合同台账：付款聚合与进度计算', async () => {
    const contractId = generateId()
    const planId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-LDGR`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '台账测试合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 200000,
      status: 'approved', ownerUserId: adminId, createdBy: adminId,
    })
    await db.insert(schema.paymentPlans).values({ id: planId, contractId, amount: 200000, planDate: '2026-09-01', status: 'pending' })
    // 已付 2 笔
    await db.insert(schema.payments).values({ id: generateId(), contractId, paymentPlanId: planId, amount: 80000, paymentDate: '2026-06-15', createdBy: adminId })
    await db.insert(schema.payments).values({ id: generateId(), contractId, paymentPlanId: planId, amount: 70000, paymentDate: '2026-07-15', createdBy: adminId })

    // 测试聚合查询（和 ledger.get.ts 一致）
    const agg = await db.select({
      contractId: schema.payments.contractId,
      totalPaid: sql<number>`sum(${schema.payments.amount})`,
    }).from(schema.payments)
      .where(eq(schema.payments.contractId, contractId))
      .groupBy(schema.payments.contractId)

    const totalPaid = agg[0]?.totalPaid ?? 0
    expect(Number(totalPaid)).toBe(150000)

    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId)).limit(1)
    const progress = Math.round((Number(totalPaid) / Number(contract!.totalAmount)) * 100)
    expect(progress).toBe(75)
  })

  it('9. 付款计划 overdue 检测', async () => {
    // 做一个过期的计划
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-OVRD`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '逾期检测合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 30000,
      status: 'approved', ownerUserId: adminId, createdBy: adminId,
    })
    await db.insert(schema.paymentPlans).values({ id: generateId(), contractId, amount: 30000, planDate: '2020-01-01', status: 'pending' })

    // 查出所有 overdue 计划
    const today = new Date().toISOString().slice(0, 10)
    const overdue = await db.select().from(schema.paymentPlans)
      .where(and(eq(schema.paymentPlans.status, 'pending'), sql`${schema.paymentPlans.planDate} < ${today}`))
    expect(overdue.length).toBeGreaterThanOrEqual(1)

    // 自动更新为 overdue
    if (overdue.length > 0) {
      await db.update(schema.paymentPlans).set({ status: 'overdue' })
        .where(inArray(schema.paymentPlans.id, overdue.map(p => p.id)))
    }
    const [updated] = await db.select().from(schema.paymentPlans).where(eq(schema.paymentPlans.contractId, contractId)).limit(1)
    expect(updated!.status).toBe('overdue')
  })

  it('10. 合同软删除 + deletedAt 过滤', async () => {
    const contractId = generateId()
    const codeNo = `C-${Date.now().toString().slice(-8)}-SOFT`
    await db.insert(schema.contracts).values({
      id: contractId, code: codeNo, name: '待删除合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 5000,
      status: 'draft', ownerUserId: adminId, createdBy: adminId,
    })
    // 软删
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.contracts).set({ deletedAt: now }).where(eq(schema.contracts.id, contractId))
    // 查不到（isNull 过滤）
    const found = await db.select().from(schema.contracts)
      .where(and(eq(schema.contracts.id, contractId), isNull(schema.contracts.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
    // 不删过滤可以查到
    const raw = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId)).limit(1)
    expect(raw).toHaveLength(1)
    expect(raw[0]!.deletedAt).toBeTruthy()
  })
})
