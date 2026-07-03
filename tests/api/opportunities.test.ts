import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull, count, sum, sql } from 'drizzle-orm'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let salesManagerId: string
let salesMemberId: string
let customerId: string
let productId: string

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists customers (id text primary key, name text not null, industry text, registered_address text, office_address text, owner_user_id text references users(id), status text not null default 'potential', remark text, lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists products (id text primary key, name text not null, code text not null unique, category_id text, model text, manufacturer text, unit text, type text, standard_price integer not null default 0, cost_price integer not null default 0, stock_quantity integer not null default 0, tax_rate real default 0, description text, status text not null default 'on_sale', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists product_categories (id text primary key, name text not null, sort text not null default '0', created_at text not null default (datetime('now')))`,
    `create table if not exists opportunities (id text primary key, name text not null, customer_id text not null references customers(id), owner_user_id text not null references users(id), estimated_amount integer not null default 0, estimated_close_date text, source text, competitor text, status text not null default 'initial_contact', lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists opportunity_products (id text primary key, opportunity_id text not null references opportunities(id), product_id text not null references products(id), quantity integer not null default 1, unit_price integer not null default 0, discount real not null default 1)`,
    `create table if not exists contacts (id text primary key, customer_id text references customers(id), name text not null, position text, phone text, email text, is_primary integer not null default 0, remark text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists follow_ups (id text primary key, customer_id text, opportunity_id text, user_id text not null references users(id), type text not null default 'phone', content text not null, next_follow_up_at text, created_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists contracts (id text primary key, code text not null unique, name text not null, customer_id text not null references customers(id), opportunity_id text references opportunities(id), party_a text not null, party_b text not null, total_amount integer not null default 0, payment_method text, start_date text, end_date text, signed_at text, status text not null default 'draft', reject_reason text, approved_by text references users(id), approved_at text, owner_user_id text references users(id), created_by text not null references users(id), remark text, content text, supplier_id text, type text not null default 'sales', direction text not null default 'income', version integer not null default 1, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists subcontracts (id text primary key, code text, name text not null, parent_contract_id text not null references contracts(id), subcontract_party_id text, total_amount integer not null default 0, tax_rate real default 0.05, service_fee integer default 0, status text not null default 'draft', start_date text, end_date text, remark text, created_by text not null references users(id), created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists quotes (id text primary key, opportunity_id text not null references opportunities(id), name text not null, total_amount integer not null default 0, status text not null default 'draft', pdf_path text, valid_until text, remark text, created_by text not null references users(id), deleted_at text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')))`,
    `create table if not exists quote_products (id text primary key, quote_id text not null references quotes(id), product_id text not null references products(id), quantity integer not null default 1, unit_price integer not null default 0, discount real not null default 1, deleted_at text)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  salesManagerId = generateId()
  salesMemberId = generateId()
  customerId = generateId()
  productId = generateId()

  await db.insert(schema.users).values({ id: adminId, username: 'admin', password: 'hash', name: '管理员', role: 'admin', status: 'active' })
  await db.insert(schema.users).values({ id: salesManagerId, username: 'manager', password: 'hash', name: '销售负责人', role: 'sales_manager', status: 'active' })
  await db.insert(schema.users).values({ id: salesMemberId, username: 'member1', password: 'hash', name: '销售成员', role: 'sales_member', status: 'active' })
  await db.insert(schema.customers).values({ id: customerId, name: '商机测试客户', ownerUserId: salesMemberId })
  await db.insert(schema.products).values({ id: productId, name: '软件实施服务', code: 'P-IMPL', standardPrice: 100000, stockQuantity: 100 })
}

describe('商机全流程', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  it('1. 创建商机', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: 'XX集团ERP项目', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 300000,
      estimatedCloseDate: '2026-09-30', source: '官网', competitor: '竞品A',
      status: 'initial_contact',
    })
    await db.insert(schema.opportunityProducts).values({
      id: generateId(), opportunityId: oppId, productId, quantity: 1, unitPrice: 300000, discount: 1.0,
    })

    const [row] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, oppId)).limit(1)
    expect(row!.name).toBe('XX集团ERP项目')
    expect(row!.status).toBe('initial_contact')
    expect(row!.estimatedAmount).toBe(300000)
  })

  it('2. 销售成员只能看自己的商机', async () => {
    // member 名义查询
    const memberRows = await db.select().from(schema.opportunities)
      .where(and(eq(schema.opportunities.ownerUserId, salesMemberId), isNull(schema.opportunities.deletedAt)))
    expect(memberRows.length).toBeGreaterThanOrEqual(1)
    for (const r of memberRows) {
      expect(r.ownerUserId).toBe(salesMemberId)
    }
    // 负责人能看到全部
    const managerRows = await db.select().from(schema.opportunities).where(isNull(schema.opportunities.deletedAt))
    expect(managerRows.length).toBeGreaterThanOrEqual(memberRows.length)
  })

  it('3. 商机状态流转：initial_contact → requirement_confirmed → proposal_submitted → business_negotiation → closed_won', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '状态流转商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 100000,
      status: 'initial_contact',
    })
    const path = ['requirement_confirmed', 'proposal_submitted', 'business_negotiation', 'closed_won']
    for (const s of path) {
      await db.update(schema.opportunities).set({ status: s }).where(eq(schema.opportunities.id, oppId))
    }
    const [final] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, oppId)).limit(1)
    expect(final!.status).toBe('closed_won')
  })

  it('4. 输单记录输单原因', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '失败商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 50000,
      status: 'initial_contact',
    })
    await db.update(schema.opportunities).set({ status: 'closed_lost', lostReason: '价格太高' })
      .where(eq(schema.opportunities.id, oppId))
    const [lost] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, oppId)).limit(1)
    expect(lost!.status).toBe('closed_lost')
    expect(lost!.lostReason).toBe('价格太高')
  })

  it('5. 赢单转合同（opportunity → contract）', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '转合同商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 200000,
      status: 'closed_won',
    })
    const cid = generateId()
    await db.insert(schema.contracts).values({
      id: cid, code: `C-${Date.now().toString().slice(-8)}-WON`, name: '转合同商机',
      customerId, opportunityId: oppId,
      partyA: '甲', partyB: '乙', totalAmount: 200000,
      status: 'draft', ownerUserId: salesMemberId, createdBy: adminId,
    })
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, cid)).limit(1)
    expect(contract!.opportunityId).toBe(oppId)
    expect(contract!.totalAmount).toBe(200000)
  })

  it('6. 商机漏斗统计', async () => {
    // 创建多个不同状态的商机
    const statuses: Array<{ status: string; amount: number }> = [
      { status: 'initial_contact', amount: 100000 },
      { status: 'initial_contact', amount: 50000 },
      { status: 'proposal_submitted', amount: 200000 },
      { status: 'business_negotiation', amount: 300000 },
      { status: 'closed_won', amount: 150000 },
    ]
    for (const s of statuses) {
      await db.insert(schema.opportunities).values({
        id: generateId(), name: `漏斗-${s.status}`, customerId,
        ownerUserId: salesMemberId, estimatedAmount: s.amount, status: s.status,
      })
    }
    // 漏斗聚合（和 funnel.get.ts 一致）
    const funnel = await db.select({
      status: schema.opportunities.status,
      count: count(),
      total: sum(schema.opportunities.estimatedAmount),
    }).from(schema.opportunities)
      .where(and(
        isNull(schema.opportunities.deletedAt),
        sql`${schema.opportunities.status} not in ('closed_won', 'closed_lost')`
      ))
      .groupBy(schema.opportunities.status)

    expect(funnel.length).toBeGreaterThanOrEqual(3)
    const proposalStage = funnel.find(f => f.status === 'proposal_submitted')
    expect(proposalStage).toBeDefined()
    expect(Number(proposalStage!.total)).toBeGreaterThanOrEqual(200000)
  })

  it('7. 商机关联跟进记录', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '跟进测试商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 80000,
      status: 'initial_contact',
    })
    await db.insert(schema.followUps).values({
      id: generateId(), opportunityId: oppId, userId: salesMemberId,
      type: 'phone', content: '已联系技术负责人，下周安排演示', nextFollowUpAt: '2026-07-01',
    })
    await db.insert(schema.followUps).values({
      id: generateId(), opportunityId: oppId, userId: salesMemberId,
      type: 'phone', content: '演示完成，对方对模块1很感兴趣',
    })
    const followUps = await db.select().from(schema.followUps).where(eq(schema.followUps.opportunityId, oppId))
    expect(followUps).toHaveLength(2)
  })

  it('8. 商机报价流程：draft → sent → accepted', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '报价测试商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 120000,
      status: 'business_negotiation',
    })
    const quoteId = generateId()
    await db.insert(schema.quotes).values({
      id: quoteId, opportunityId: oppId, name: '报价单-001', totalAmount: 120000, status: 'draft', createdBy: adminId,
    })
    await db.insert(schema.quoteProducts).values({
      id: generateId(), quoteId, productId, quantity: 1, unitPrice: 120000, discount: 1.0,
    })
    // 发送
    await db.update(schema.quotes).set({ status: 'sent' }).where(eq(schema.quotes.id, quoteId))
    const [sent] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId)).limit(1)
    expect(sent!.status).toBe('sent')
    // 接受
    await db.update(schema.quotes).set({ status: 'accepted' }).where(eq(schema.quotes.id, quoteId))
    const [accepted] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId)).limit(1)
    expect(accepted!.status).toBe('accepted')
  })

  it('9. 报价软删除', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '报价删除测试', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 50000,
      status: 'initial_contact',
    })
    const quoteId = generateId()
    await db.insert(schema.quotes).values({
      id: quoteId, opportunityId: oppId, name: '待删报价', totalAmount: 50000, status: 'draft', createdBy: adminId,
    })
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.quotes).set({ deletedAt: now }).where(eq(schema.quotes.id, quoteId))
    // 关联产品也删除
    await db.delete(schema.quoteProducts).where(eq(schema.quoteProducts.quoteId, quoteId))

    const found = await db.select().from(schema.quotes)
      .where(and(eq(schema.quotes.id, quoteId), isNull(schema.quotes.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })

  it('10. 商机软删除', async () => {
    const oppId = generateId()
    await db.insert(schema.opportunities).values({
      id: oppId, name: '待删商机', customerId,
      ownerUserId: salesMemberId, estimatedAmount: 10000,
      status: 'closed_lost', lostReason: '无预算',
    })
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.opportunities).set({ deletedAt: now }).where(eq(schema.opportunities.id, oppId))

    const found = await db.select().from(schema.opportunities)
      .where(and(eq(schema.opportunities.id, oppId), isNull(schema.opportunities.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })
})
