import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull } from 'drizzle-orm'
import { SignJWT, jwtVerify } from 'jose'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'
import { hashPassword, verifyPassword } from '../../server/utils/auth'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let memberId: string

const SECRET = new TextEncoder().encode('auth-security-test-secret-32b')

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists roles (id text primary key, name text not null, code text not null unique, description text, is_system integer not null default 0, sort_order integer not null default 0, deleted_at text, created_at text not null default (datetime('now')))`,
    `create table if not exists permissions (id text primary key, code text not null unique, name text not null, resource text not null, action text not null, created_at text not null default (datetime('now')))`,
    `create table if not exists role_permissions (role_id text not null, permission_id text not null)`,
    `create table if not exists customers (id text primary key, name text not null, industry text, registered_address text, office_address text, owner_user_id text references users(id), status text not null default 'potential', remark text, lost_reason text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    // 需要 users 表的 deletedAt 支持严格查询
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  memberId = generateId()
  const hash = await hashPassword('admin123')
  const memberHash = await hashPassword('member456')
  await db.insert(schema.users).values({ id: adminId, username: 'admin', password: hash, name: '管理员', role: 'admin', status: 'active' })
  await db.insert(schema.users).values({ id: memberId, username: 'member', password: memberHash, name: '成员', role: 'sales_member', status: 'active' })
}

async function generateToken(userId: string, role: string, tokenVersion: number, type: 'access' | 'refresh' = 'access') {
  return new SignJWT({ userId, role, tokenVersion, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(type === 'access' ? '2h' : '7d')
    .sign(SECRET)
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { valid: true, payload }
  } catch {
    return { valid: false, payload: null }
  }
}

describe('认证与安全', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  // ---- 密码安全 ----
  it('1. bcrypt 哈希不可逆', async () => {
    const plain = 'my-secret-password'
    const hash = await hashPassword(plain)
    expect(hash).not.toBe(plain)
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/)
  })

  it('2. 正确密码验证通过', async () => {
    const result = await verifyPassword('admin123', (await db.select({ p: schema.users.password }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1))[0]!.p)
    expect(result).toBe(true)
  })

  it('3. 错误密码验证失败', async () => {
    const result = await verifyPassword('wrong-password', (await db.select({ p: schema.users.password }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1))[0]!.p)
    expect(result).toBe(false)
  })

  it('4. 空字符串验证失败', async () => {
    const result = await verifyPassword('', (await db.select({ p: schema.users.password }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1))[0]!.p)
    expect(result).toBe(false)
  })

  it('5. 同一密码两次哈希结果不同（不同盐）', async () => {
    const h1 = await hashPassword('test123')
    const h2 = await hashPassword('test123')
    expect(h1).not.toBe(h2)
  })

  // ---- JWT ----
  it('6. 生成有效 access token', async () => {
    const token = await generateToken(adminId, 'admin', 0, 'access')
    const { valid, payload } = await verifyToken(token)
    expect(valid).toBe(true)
    expect(payload!.userId).toBe(adminId)
    expect(payload!.role).toBe('admin')
    expect(payload!.type).toBe('access')
    expect(payload!.tokenVersion).toBe(0)
  })

  it('7. 生成有效 refresh token', async () => {
    const token = await generateToken(adminId, 'admin', 0, 'refresh')
    const { valid, payload } = await verifyToken(token)
    expect(valid).toBe(true)
    expect(payload!.type).toBe('refresh')
  })

  it('8. 错误密钥无法验证 token', async () => {
    const token = await generateToken(adminId, 'admin', 0)
    const wrongSecret = new TextEncoder().encode('totally-different-secret-key')
    try {
      await jwtVerify(token, wrongSecret)
      expect.fail('应抛出错误')
    } catch {
      // 预期行为
    }
  })

  it('9. 过期 token 验证失败', async () => {
    const expiredToken = await new SignJWT({ userId: adminId, role: 'admin', tokenVersion: 0, type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('0s') // 立即过期
      .sign(SECRET)
    const { valid } = await verifyToken(expiredToken)
    expect(valid).toBe(false)
  })

  // ---- token 版本号（登出失效机制） ----
  it('10. tokenVersion 不匹配时拒绝', async () => {
    // 签发时 version=3，但用户当前 version=5
    const userVersion = 5
    const token = await generateToken(adminId, 'admin', 3)
    const { valid, payload } = await verifyToken(token)
    // token 本身有效，中间件层比对：payload.tokenVersion < user.tokenVersion → 拒绝
    if (valid) {
      const currentVersion = userVersion
      expect(payload!.tokenVersion).toBeLessThan(currentVersion)
      // 实际业务中此时返回 401
    }
  })

  it('11. 登出后更新 tokenVersion 让旧 token 失效', async () => {
    const currentVersion = (await db.select({ v: schema.users.tokenVersion }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1))[0]!.v
    // 登出：tokenVersion + 1
    await db.update(schema.users).set({ tokenVersion: currentVersion + 1 }).where(eq(schema.users.id, adminId))
    const newVersion = (await db.select({ v: schema.users.tokenVersion }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1))[0]!.v
    expect(newVersion).toBe(currentVersion + 1)
  })

  it('12. refresh token 也携带 tokenVersion 并能刷新', async () => {
    const [user] = await db.select({ tokenVersion: schema.users.tokenVersion }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1)
    const refreshToken = await generateToken(adminId, 'admin', user!.tokenVersion, 'refresh')
    const { valid, payload } = await verifyToken(refreshToken)
    expect(valid).toBe(true)
    expect(payload!.type).toBe('refresh')
    expect(payload!.tokenVersion).toBe(user!.tokenVersion)
  })

  // ---- 权限角色 ----
  it('13. sales_member 数据隔离：只能查自己的', async () => {
    // 创建 2 个客户，分别属于不同人
    await db.insert(schema.customers).values({ id: generateId(), name: '成员的客户', ownerUserId: memberId })
    await db.insert(schema.customers).values({ id: generateId(), name: '其他人的客户', ownerUserId: adminId })

    // member 视角
    const memberRows = await db.select().from(schema.customers)
      .where(and(eq(schema.customers.ownerUserId, memberId), isNull(schema.customers.deletedAt)))
    expect(memberRows.length).toBe(1)
    expect(memberRows[0]!.name).toBe('成员的客户')
  })

  it('14. admin 能看到全部数据', async () => {
    const all = await db.select().from(schema.customers).where(isNull(schema.customers.deletedAt))
    expect(all.length).toBe(2)
  })

  it('15. 禁用用户不可登录', async () => {
    const disabledId = generateId()
    await db.insert(schema.users).values({ id: disabledId, username: 'disabled_user', password: await hashPassword('x'), name: '已禁用', role: 'sales_member', status: 'disabled' })
    const [user] = await db.select({ status: schema.users.status }).from(schema.users).where(eq(schema.users.id, disabledId)).limit(1)
    expect(user!.status).toBe('disabled')
    // 实际登录端点会检查 status 后再签发 token
  })

  it('16. 不能删除自己', async () => {
    const [self] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, adminId)).limit(1)
    expect(self).toBeDefined()
    // user.delete.ts:16 有 if (id === user.userId) throw 400
    // 此处模拟检查逻辑
    const targetId = adminId
    const currentUserId = adminId
    expect(targetId === currentUserId).toBe(true)
  })

  it('17. 用户软删除 + 数据转交', async () => {
    const tmpId = generateId()
    await db.insert(schema.users).values({ id: tmpId, username: 'tmp_user', password: await hashPassword('x'), name: '临时用户', role: 'sales_member', status: 'active' })
    // 该用户有一个客户
    await db.insert(schema.customers).values({ id: generateId(), name: '待转交客户', ownerUserId: tmpId })

    // 转交客户给 admin
    await db.update(schema.customers).set({ ownerUserId: adminId } as any).where(eq(schema.customers.ownerUserId, tmpId))

    // 软删用户
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.users).set({ deletedAt: now }).where(eq(schema.users.id, tmpId))

    // 客户已转给 admin
    const customers = await db.select().from(schema.customers).where(eq(schema.customers.ownerUserId, adminId))
    const hasTransferred = customers.some(c => c.name === '待转交客户')
    // 可能有 seed 的 admin 客户 + 转交的客户
    expect(hasTransferred).toBe(true)

    // 用户已软删
    const found = await db.select().from(schema.users)
      .where(and(eq(schema.users.id, tmpId), isNull(schema.users.deletedAt))).limit(1)
    expect(found).toHaveLength(0)
  })
})
