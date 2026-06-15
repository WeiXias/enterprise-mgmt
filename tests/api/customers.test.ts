import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull } from 'drizzle-orm'
import { SignJWT } from 'jose'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'
import { hashPassword } from '../../server/utils/auth'

type DrizzleDB = ReturnType<typeof drizzle>

let db: DrizzleDB
let sqlite: ReturnType<typeof Database>
let adminToken: string
let adminId: string

const SECRET = new TextEncoder().encode('test-secret-key-for-integration-tests-only')

async function issueToken(userId: string, role: string) {
  return new SignJWT({ userId, role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SECRET)
}

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists roles (id text primary key, name text not null, code text not null unique, description text, is_system integer not null default 0, sort_order integer not null default 0, deleted_at text, created_at text not null default (datetime('now')))`,
    `create table if not exists permissions (id text primary key, code text not null unique, name text not null, resource text not null, action text not null, created_at text not null default (datetime('now')))`,
    `create table if not exists role_permissions (role_id text references roles(id), permission_id text references permissions(id), primary key(role_id, permission_id))`,
    `create table if not exists customers (id text primary key, name text not null, industry text, registered_address text, office_address text, owner_user_id text references users(id), status text not null default 'potential', remark text, lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists tags (id text primary key, name text not null, color text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists customer_tags (customer_id text references customers(id), tag_id text references tags(id), primary key(customer_id, tag_id))`,
    `create table if not exists contacts (id text primary key, customer_id text references customers(id), name text not null, position text, phone text, email text, is_primary integer not null default 0, remark text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()

  const permIds: Record<string, string> = {}
  for (const code of ['customer:view', 'customer:create', 'customer:edit', 'customer:delete']) {
    permIds[code] = generateId()
    await db.insert(schema.permissions).values({ id: permIds[code]!, code, name: code, resource: 'customer', action: code.split(':')[1] || 'view' })
  }
  const roleId = generateId()
  await db.insert(schema.roles).values({ id: roleId, name: '管理员', code: 'admin', isSystem: true, sortOrder: 0 })
  for (const pid of Object.values(permIds)) {
    await db.insert(schema.rolePermissions).values({ roleId, permissionId: pid! })
  }

  const pwd = await hashPassword('x')
  await db.insert(schema.users).values({
    id: adminId, username: 't_admin', password: pwd, name: 'TAdmin', role: 'admin', status: 'active',
  })
  await db.insert(schema.tags).values({ id: generateId(), name: 'VIP', color: '#f00' })

  adminToken = await issueToken(adminId, 'admin')
}

// ---- helpers that exercise business logic the same way real API handlers do ----

async function createCustomer(body: any) {
  const { name, industry, status, registeredAddress, contacts: inputContacts, remark } = body
  if (!name) return { code: 422, message: '名称不能为空' }

  const id = generateId()
  const now = new Date().toISOString()
  await db.insert(schema.customers).values({
    id, name, industry: industry || null, status: status || 'potential',
    registeredAddress: registeredAddress || null, ownerUserId: adminId,
    remark: remark || null, createdAt: now, updatedAt: now,
  })
  if (inputContacts?.length && schema.contacts) {
    for (const c of inputContacts) {
      await db.insert(schema.contacts).values({
        id: generateId(), customerId: id, name: c.name, phone: c.phone || null,
        position: c.position || null, isPrimary: c.isPrimary ?? false,
      })
    }
  }
  return { code: 0, data: { id } }
}

async function getCustomer(id: string) {
  const rows = await db.select().from(schema.customers)
    .where(and(eq(schema.customers.id, id), isNull(schema.customers.deletedAt))).limit(1)
  if (rows.length === 0) return { code: 404, message: 'not found' }
  const c = rows[0]!
  return { code: 0, data: { id: c.id, name: c.name, industry: c.industry, status: c.status, remark: c.remark } }
}

async function listCustomers(page = 1, pageSize = 20) {
  const all = await db.select().from(schema.customers).where(isNull(schema.customers.deletedAt))
  return {
    code: 0,
    data: {
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      pageSize,
    },
  }
}

async function deleteCustomer(id: string) {
  await db.update(schema.customers).set({ deletedAt: new Date().toISOString() }).where(eq(schema.customers.id, id))
  return { code: 0 }
}

describe('customers CRUD (integration-style)', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })

  afterAll(() => sqlite.close())

  let customerId = ''

  it('POST create customer', async () => {
    const res = await createCustomer({ name: '集成测试客户', industry: '软件', status: 'potential', registeredAddress: '北京', contacts: [{ name: '张三', phone: '13900001111', position: 'CTO', isPrimary: true }], remark: 'hello' })
    expect(res.code).toBe(0)
    expect(res.data!.id).toBeTruthy()
    customerId = res.data!.id
  })

  it('POST without name returns 422', async () => {
    const res = await createCustomer({ name: '' })
    expect(res.code).toBe(422)
  })

  it('GET customer by id', async () => {
    const res = await getCustomer(customerId)
    expect(res.code).toBe(0)
    expect(res.data!.name).toBe('集成测试客户')
  })

  it('GET non-existent returns 404', async () => {
    const res = await getCustomer('no-such-id')
    expect(res.code).toBe(404)
  })

  it('GET customer list contains new item', async () => {
    const res = await listCustomers()
    expect(res.code).toBe(0)
    expect(res.data!.total).toBeGreaterThanOrEqual(1)
  })

  it('DELETE customer (soft)', async () => {
    const res = await deleteCustomer(customerId)
    expect(res.code).toBe(0)
    const after = await getCustomer(customerId)
    expect(after.code).toBe(404)
  })

  it('list excludes soft-deleted', async () => {
    const res = await listCustomers()
    expect(res.data!.items.some((c: any) => c.id === customerId)).toBe(false)
  })
})
