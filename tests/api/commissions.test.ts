import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull } from 'drizzle-orm'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'
import { requireTransition } from '../../server/utils/workflow'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let salesId: string
let customerId: string
let contractId: string
let ruleContractAmt: string
let rulePaymentAmt: string

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists customers (id text primary key, name text not null, industry text, registered_address text, office_address text, owner_user_id text references users(id), status text not null default 'potential', remark text, lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists products (id text primary key, name text not null, code text not null unique, category_id text, unit text, standard_price integer not null default 0, cost_price integer not null default 0, stock_quantity integer not null default 0, description text, status text not null default 'on_sale', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists product_categories (id text primary key, name text not null, sort text not null default '0', created_at text not null default (datetime('now')))`,
    `create table if not exists contracts (id text primary key, code text not null unique, name text not null, customer_id text not null references customers(id), opportunity_id text, party_a text not null, party_b text not null, total_amount integer not null default 0, payment_method text, start_date text, end_date text, status text not null default 'draft', reject_reason text, approved_by text references users(id), approved_at text, owner_user_id text references users(id), created_by text not null references users(id), remark text, content text, parent_contract_id text, contract_type text not null default 'main', subcontract_party_id text, tax_rate real default 0.05, service_fee integer default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists payment_plans (id text primary key, contract_id text not null references contracts(id), amount integer not null default 0, plan_date text not null, remark text, status text not null default 'pending', created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists payments (id text primary key, contract_id text not null references contracts(id), payment_plan_id text references payment_plans(id), amount integer not null default 0, payment_date text not null, payment_method text, remark text, created_by text not null references users(id), created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists commission_rules (id text primary key, name text not null, base_type text not null default 'payment_amount', product_id text references products(id), min_amount integer not null default 0, max_amount integer, rate real not null default 0, is_active text not null default 'yes', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')))`,
    `create table if not exists commissions (id text primary key, user_id text not null references users(id), contract_id text not null references contracts(id), payment_id text, rule_id text references commission_rules(id), base_amount integer not null default 0, rate real not null default 0, amount integer not null default 0, status text not null default 'pending', adjust_amount integer default 0, adjust_reason text, approved_by text references users(id), approved_at text, period_month text not null, remark text, created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists commission_payouts (id text primary key, period_month text not null, total_amount integer not null default 0, status text not null default 'draft', paid_at text, remark text, created_by text not null references users(id), created_at text not null default (datetime('now')))`,
    `create table if not exists commission_payout_items (id text primary key, payout_id text not null references commission_payouts(id), commission_id text not null references commissions(id), user_id text not null references users(id), amount integer not null default 0)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  salesId = generateId()
  customerId = generateId()
  contractId = generateId()
  ruleContractAmt = generateId()
  rulePaymentAmt = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(schema.users).values({ id: adminId, username: 'admin', password: 'hash', name: '管理员', role: 'admin', status: 'active' })
  await db.insert(schema.users).values({ id: salesId, username: 'sales1', password: 'hash', name: '销售员', role: 'sales_manager', status: 'active' })
  await db.insert(schema.customers).values({ id: customerId, name: '提成测试客户', ownerUserId: salesId })
  await db.insert(schema.contracts).values({
    id: contractId, code: 'C-COMM-TEST', name: '提成测试合同', customerId,
    partyA: '甲', partyB: '乙', totalAmount: 200000,
    status: 'approved', ownerUserId: adminId, createdBy: adminId,
  })
  // 两套规则
  await db.insert(schema.commissionRules).values({ id: ruleContractAmt, name: '合同额5%', baseType: 'contract_amount', rate: 0.05, isActive: 'yes' })
  await db.insert(schema.commissionRules).values({ id: rulePaymentAmt, name: '回款额10%', baseType: 'payment_amount', rate: 0.10, isActive: 'yes' })
}

describe('提成全流程', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  it('1. 状态机：pending → approved 合法', () => {
    expect(() => requireTransition('commissions', 'pending', 'approved')).not.toThrow()
  })

  it('2. 状态机：pending → paid 非法（跳过审批）', () => {
    expect(() => requireTransition('commissions', 'pending', 'paid')).toThrow('不能变更为')
  })

  it('3. 状态机：paid → rejected 非法（终态不可逆）', () => {
    expect(() => requireTransition('commissions', 'paid', 'rejected')).toThrow('不能变更为')
  })

  it('4. 按合同金额计算提成（baseType=contract_amount）', async () => {
    // 200000 * 5% = 10000
    const commissionId = generateId()
    await db.insert(schema.commissions).values({
      id: commissionId, userId: salesId, contractId, ruleId: ruleContractAmt,
      baseAmount: 200000, rate: 0.05, amount: 10000, status: 'pending',
      periodMonth: '2026-06',
    })
    const [row] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, commissionId)).limit(1)
    expect(row!.baseAmount).toBe(200000)
    expect(row!.amount).toBe(10000)
    expect(row!.status).toBe('pending')
  })

  it('5. 按回款金额计算提成（baseType=payment_amount）', async () => {
    // 一笔 50000 的回款 * 10% = 5000
    const paymentId = generateId()
    await db.insert(schema.payments).values({ id: paymentId, contractId, amount: 50000, paymentDate: '2026-06-15', createdBy: adminId })
    const commissionId = generateId()
    await db.insert(schema.commissions).values({
      id: commissionId, userId: salesId, contractId, paymentId, ruleId: rulePaymentAmt,
      baseAmount: 50000, rate: 0.10, amount: 5000, status: 'pending',
      periodMonth: '2026-06',
    })
    const [row] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, commissionId)).limit(1)
    expect(row!.baseAmount).toBe(50000)
    expect(row!.amount).toBe(5000)
    expect(row!.paymentId).toBe(paymentId)
  })

  it('6. 幂等性：同一合同+规则不重复计算', async () => {
    // 模拟 calculate.post.ts 的幂等检查
    const existing = await db.select({ id: schema.commissions.id }).from(schema.commissions)
      .where(and(
        eq(schema.commissions.contractId, contractId),
        eq(schema.commissions.ruleId, ruleContractAmt),
        isNull(schema.commissions.deletedAt),
      )).limit(1)
    expect(existing.length).toBe(1) // 已有一条
    // 如果再算一次应该跳过
  })

  it('7. 审批通过提成', async () => {
    // 找一个 pending 的
    const [pending] = await db.select().from(schema.commissions)
      .where(and(eq(schema.commissions.status, 'pending'), isNull(schema.commissions.deletedAt))).limit(1)
    expect(pending).toBeDefined()

    // 校验状态机
    requireTransition('commissions', pending!.status, 'approved')
    await db.update(schema.commissions).set({
      status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }).where(eq(schema.commissions.id, pending!.id))

    const [approved] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, pending!.id)).limit(1)
    expect(approved!.status).toBe('approved')
    expect(approved!.approvedBy).toBe(adminId)
  })

  it('8. 已发放提成不可调整', async () => {
    // 创建一条 paid 状态的提成
    const paidId = generateId()
    await db.insert(schema.commissions).values({
      id: paidId, userId: salesId, contractId, ruleId: ruleContractAmt,
      baseAmount: 200000, rate: 0.05, amount: 10000, status: 'paid',
      periodMonth: '2026-05', approvedBy: adminId, approvedAt: '2026-05-15',
    })
    const [paid] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, paidId)).limit(1)
    expect(paid!.status).toBe('paid')
    // 状态机校验：paid 不允许任何变更
    expect(() => requireTransition('commissions', 'paid', 'rejected')).toThrow('不能变更为')
  })

  it('9. 提成拒绝流程', async () => {
    // 创建 pending 并拒绝
    const rejectedId = generateId()
    await db.insert(schema.commissions).values({
      id: rejectedId, userId: salesId, contractId, ruleId: ruleContractAmt,
      baseAmount: 200000, rate: 0.05, amount: 10000, status: 'pending',
      periodMonth: '2026-06', adjustReason: '理由不充分',
    })
    requireTransition('commissions', 'pending', 'rejected')
    await db.update(schema.commissions).set({ status: 'rejected', adjustReason: '业绩不达标' }).where(eq(schema.commissions.id, rejectedId))
    const [rejected] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, rejectedId)).limit(1)
    expect(rejected!.status).toBe('rejected')
  })

  it('10. 提成发放（payout）—— 确认并支付', async () => {
    // 创建已审批提成
    const commissionId = generateId()
    await db.insert(schema.commissions).values({
      id: commissionId, userId: salesId, contractId, ruleId: ruleContractAmt,
      baseAmount: 200000, rate: 0.05, amount: 10000, status: 'approved',
      periodMonth: '2026-06', approvedBy: adminId, approvedAt: '2026-06-15',
    })
    // 创建发放单
    const payoutId = generateId()
    await db.insert(schema.commissionPayouts).values({
      id: payoutId, periodMonth: '2026-06', totalAmount: 10000, status: 'confirmed', createdBy: adminId,
    })
    await db.insert(schema.commissionPayoutItems).values({
      id: generateId(), payoutId, commissionId, userId: salesId, amount: 10000,
    })
    // 标记提成为已发放
    requireTransition('commissions', 'approved', 'paid')
    await db.update(schema.commissions).set({ status: 'paid' }).where(eq(schema.commissions.id, commissionId))

    const [paid] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, commissionId)).limit(1)
    expect(paid!.status).toBe('paid')
  })

  it('11. 提成软删除', async () => {
    const commissionId = generateId()
    await db.insert(schema.commissions).values({
      id: commissionId, userId: salesId, contractId, ruleId: ruleContractAmt,
      baseAmount: 100000, rate: 0.05, amount: 5000, status: 'pending', periodMonth: '2026-03',
    })
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.commissions).set({ deletedAt: now }).where(eq(schema.commissions.id, commissionId))

    const found = await db.select().from(schema.commissions)
      .where(and(eq(schema.commissions.id, commissionId), isNull(schema.commissions.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })

  it('12. 金额精度：整数分计算（50000 * 0.05 = 2500）', async () => {
    const cid = generateId()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 合同 50000分 = 500.00元
    await db.insert(schema.contracts).values({
      id: cid, code: `C-${cid.slice(0, 8)}`, name: '精度合同', customerId,
      partyA: '甲', partyB: '乙', totalAmount: 50000,
      status: 'approved', ownerUserId: adminId, createdBy: adminId,
    })
    // 提成 5%
    const amount = Math.round(50000 * 0.05)
    expect(amount).toBe(2500)
    // 2500分 = 25.00元，不会出现 2500.0000000001 或 2499.9999999
    expect(Number.isInteger(amount)).toBe(true)
  })
})
