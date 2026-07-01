import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull, sql } from 'drizzle-orm'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let productId: string
let productId2: string

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists products (id text primary key, name text not null, code text not null unique, category_id text, model text, manufacturer text, unit text, standard_price integer not null default 0, cost_price integer not null default 0, stock_quantity integer not null default 0, description text, status text not null default 'on_sale', created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists product_categories (id text primary key, name text not null, sort text not null default '0', created_at text not null default (datetime('now')))`,
    `create table if not exists inventory_transactions (id text primary key, product_id text not null, type text not null, quantity integer not null, unit_price integer default 0, contract_id text, project_id text, batch_no text, remark text, operator_id text not null, deleted_at text, created_at text not null default (datetime('now')))`,
    `create table if not exists product_categories (id text primary key, name text not null, parent_id text, sort_order integer not null default 0, created_at text not null default (datetime('now')))`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  productId = generateId()
  productId2 = generateId()
  await db.insert(schema.users).values({ id: adminId, username: 'tester', password: 'hash', name: '测试员', role: 'admin', status: 'active' })
  await db.insert(schema.products).values({ id: productId, name: '可销售产品', code: 'P-001', standardPrice: 100000, stockQuantity: 50 })
  await db.insert(schema.products).values({ id: productId2, name: '紧缺产品', code: 'P-002', standardPrice: 50000, stockQuantity: 3 })
}

describe('产品与库存全流程', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  // ---- 产品 CRUD ----
  it('1. 创建产品', async () => {
    const id = generateId()
    await db.insert(schema.products).values({
      id, name: '新上线产品', code: 'P-NEW', standardPrice: 80000, costPrice: 50000, stockQuantity: 20, status: 'on_sale',
    })
    const [row] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1)
    expect(row!.name).toBe('新上线产品')
    expect(row!.standardPrice).toBe(80000)
    expect(row!.stockQuantity).toBe(20)
  })

  it('2. 更新产品信息', async () => {
    await db.update(schema.products).set({ standardPrice: 90000, stockQuantity: 30 }).where(eq(schema.products.id, productId))
    const [row] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(row!.standardPrice).toBe(90000)
    expect(row!.stockQuantity).toBe(30)
  })

  it('3. 产品上架/下架切换', async () => {
    await db.update(schema.products).set({ status: 'off_shelf' } as any).where(eq(schema.products.id, productId))
    const [row] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(row!.status).toBe('off_shelf')
    // 恢复
    await db.update(schema.products).set({ status: 'on_sale' } as any).where(eq(schema.products.id, productId))
  })

  // ---- 入库 ----
  it('4. 入库增加库存', async () => {
    const before = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    const delta = 10
    // 原子操作（和 index.post.ts 一致）
    await db.update(schema.products).set({
      stockQuantity: sql`stock_quantity + ${delta}`,
    }).where(eq(schema.products.id, productId))

    await db.insert(schema.inventoryTransactions).values({
      id: generateId(), productId, type: 'inbound', quantity: delta, operatorId: adminId,
    })

    const after = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(after[0]!.s).toBe(before[0]!.s + delta)
  })

  // ---- 出库 ----
  it('5. 出库减少库存', async () => {
    const before = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    const delta = 5
    await db.update(schema.products).set({
      stockQuantity: sql`stock_quantity - ${delta}`,
    }).where(and(
      eq(schema.products.id, productId),
      sql`stock_quantity >= ${delta}`,
    ))

    await db.insert(schema.inventoryTransactions).values({
      id: generateId(), productId, type: 'outbound', quantity: -delta, operatorId: adminId,
    })

    const after = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(after[0]!.s).toBe(before[0]!.s - delta)
  })

  it('6. 出库超额保护（库存不足时 changes=0）', async () => {
    const before = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId2)).limit(1)
    // productId2 只有 3 个库存，尝试出 100 个
    const huge = 100
    const result = await db.update(schema.products).set({
      stockQuantity: sql`stock_quantity - ${huge}`,
    }).where(and(
      eq(schema.products.id, productId2),
      sql`stock_quantity >= ${huge}`,
    ))
    expect(result.changes).toBe(0) // 原子的 changes=0 保护了库存
    // 库存不变
    const after = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId2)).limit(1)
    expect(after[0]!.s).toBe(before[0]!.s)
  })

  it('7. 库存调整（adjustment）', async () => {
    const before = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    await db.update(schema.products).set({ stockQuantity: sql`stock_quantity + 2` }).where(eq(schema.products.id, productId))
    await db.insert(schema.inventoryTransactions).values({
      id: generateId(), productId, type: 'adjustment', quantity: 2, remark: '盘点调整', operatorId: adminId,
    })
    const after = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(after[0]!.s).toBe(before[0]!.s + 2)
  })

  // ---- 软删除 ----
  it('8. 库存记录软删除 + 库存回退', async () => {
    const before = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    // 创建一条出库记录
    const txId = generateId()
    const txDelta = -2
    await db.insert(schema.inventoryTransactions).values({
      id: txId, productId, type: 'outbound', quantity: txDelta, operatorId: adminId,
    })
    await db.update(schema.products).set({ stockQuantity: sql`stock_quantity + ${txDelta}` }).where(eq(schema.products.id, productId))

    // 软删并回退
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.inventoryTransactions).set({ deletedAt: now }).where(eq(schema.inventoryTransactions.id, txId))
    const reverse = -txDelta // +2
    await db.update(schema.products).set({ stockQuantity: sql`stock_quantity + ${reverse}` }).where(eq(schema.products.id, productId))

    const after = await db.select({ s: schema.products.stockQuantity }).from(schema.products).where(eq(schema.products.id, productId)).limit(1)
    expect(after[0]!.s).toBe(before[0]!.s) // 恢复原值

    const found = await db.select().from(schema.inventoryTransactions)
      .where(and(eq(schema.inventoryTransactions.id, txId), isNull(schema.inventoryTransactions.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })

  it('9. 产品软删除', async () => {
    const tmpId = generateId()
    await db.insert(schema.products).values({ id: tmpId, name: '待删产品', code: 'P-DEL', standardPrice: 1000, stockQuantity: 0 })
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.products).set({ deletedAt: now }).where(eq(schema.products.id, tmpId))

    const found = await db.select().from(schema.products)
      .where(and(eq(schema.products.id, tmpId), isNull(schema.products.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })

  it('10. 库存交易列表过滤', async () => {
    // 创建 3 条交易
    for (let i = 0; i < 3; i++) {
      await db.insert(schema.inventoryTransactions).values({
        id: generateId(), productId, type: 'inbound', quantity: 1, operatorId: adminId,
      })
    }
    const all = await db.select().from(schema.inventoryTransactions).where(isNull(schema.inventoryTransactions.deletedAt))
    expect(all.length).toBeGreaterThanOrEqual(3)
  })
})
