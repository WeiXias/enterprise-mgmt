/**
 * 创建管理员账号（生产环境安全脚本）
 * 不会删除已有数据，只追加用户。
 *
 * 用法：
 *   npx tsx scripts/create-admin.ts
 *   自定义：ADMIN_USERNAME=xxx ADMIN_PASSWORD=xxx npx tsx scripts/create-admin.ts
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '../server/database/schema/index'
import { hashPassword } from '../server/utils/auth'
import { generateId } from '../server/utils/id'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'data', 'enterprise.db')
const USERNAME = process.env.ADMIN_USERNAME || 'admin'
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

async function main() {
  if (!USERNAME || !PASSWORD) {
    console.error('ERROR: ADMIN_USERNAME 和 ADMIN_PASSWORD 不能为空')
    process.exit(1)
  }
  if (PASSWORD.length < 6) {
    console.error('ERROR: 密码至少 6 位')
    process.exit(1)
  }

  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })

  // 检查是否已存在同名用户
  const existing = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.username, USERNAME)).limit(1)

  if (existing.length > 0) {
    console.log(`用户 "${USERNAME}" 已存在，跳过创建。`)
    sqlite.close()
    return
  }

  const id = generateId()
  const pwd = await hashPassword(PASSWORD)
  const now = new Date().toISOString()

  await db.insert(schema.users).values({
    id,
    username: USERNAME,
    password: pwd,
    name: '管理员',
    role: 'admin',
    phone: null,
    email: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  console.log(`✅ 管理员账号创建成功！`)
  console.log(`   用户名: ${USERNAME}`)
  console.log(`   密码:   ${PASSWORD}`)
  console.log(`   角色:   admin`)
  console.log(`   ⚠️  请登录后立即修改密码。`)

  sqlite.close()
}

main().catch((err) => {
  console.error('创建失败:', err)
  process.exit(1)
})
