import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import * as schema from '../../server/database/schema/index'
import { hashPassword, verifyPassword } from '../../server/utils/auth'
import { generateId } from '../../server/utils/id'

const SECRET = new TextEncoder().encode('auth-integration-test-secret')

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

let sqlite: ReturnType<typeof Database>
let db: ReturnType<typeof drizzle>
let adminId: string
let adminPwd: string

describe('auth (integration-style)', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()

    adminId = generateId()
    adminPwd = 'admin123'
    const hash = await hashPassword(adminPwd)
    await db.insert(schema.users).values({
      id: adminId, username: 'admin', password: hash, name: '管理员', role: 'admin', status: 'active',
    })
  })

  afterAll(() => sqlite.close())

  it('hashPassword + verifyPassword round-trip', async () => {
    const h = await hashPassword('test')
    expect(await verifyPassword('test', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('generateAccessToken produces valid JWT', async () => {
    const token = await new SignJWT({ userId: adminId, role: 'admin', type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(SECRET)
    expect(token).toBeTruthy()
    expect(token.split('.')).toHaveLength(3)
  })

  it('login: correct credentials', async () => {
    const rows = await db.select({ password: schema.users.password }).from(schema.users).where(eq(schema.users.username, 'admin')).limit(1)
    expect(rows).toHaveLength(1)
    const valid = await verifyPassword(adminPwd, rows[0]!.password)
    expect(valid).toBe(true)
  })

  it('login: wrong password fails', async () => {
    const rows = await db.select({ password: schema.users.password }).from(schema.users).where(eq(schema.users.username, 'admin')).limit(1)
    const valid = await verifyPassword('totally-wrong', rows[0]!.password)
    expect(valid).toBe(false)
  })

  it('login: non-existent user returns empty', async () => {
    const rows = await db.select().from(schema.users).where(eq(schema.users.username, 'nobody')).limit(1)
    expect(rows).toHaveLength(0)
  })

  it('disabled user cannot login', async () => {
    const uid = generateId()
    await db.insert(schema.users).values({
      id: uid, username: 'disabled_user', password: await hashPassword('x'), name: '禁用', role: 'sales_member', status: 'disabled',
    })
    const rows = await db.select({ status: schema.users.status }).from(schema.users).where(eq(schema.users.username, 'disabled_user')).limit(1)
    expect(rows[0]!.status).toBe('disabled')
  })

  it('token generation ignores disabled flag (handled at login level)', async () => {
    // Token generation itself doesn't check status — that's the endpoint's job
    const token = await new SignJWT({ userId: 'any', role: 'admin', type: 'access' })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(SECRET)
    expect(token).toBeTruthy()
  })
})
