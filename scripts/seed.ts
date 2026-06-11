// 种子脚本 - 创建初始管理员用户
import Database from 'better-sqlite3'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'

const DB_PATH = './data/enterprise.db'

async function seed() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const now = new Date().toISOString()
  const passwordHash = await hash('admin123', 10)

  // 检查是否已有管理员
  const existing = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (existing) {
    console.log('管理员账号已存在，跳过创建')
    sqlite.close()
    return
  }

  const id = randomUUID()
  sqlite.prepare(`
    INSERT INTO users (id, username, password, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, 'admin', passwordHash, '管理员', 'admin', 'active', now, now)

  console.log('✅ 管理员账号创建成功！')
  console.log('   用户名: admin')
  console.log('   密码: admin123')

  // 再创建几个测试用户
  const testUsers = [
    { username: 'zhangsan', name: '张三', role: 'sales_manager' },
    { username: 'lisi', name: '李四', role: 'sales_member' },
    { username: 'wangwu', name: '王五', role: 'finance' },
  ]

  for (const u of testUsers) {
    const uid = randomUUID()
    const ph = await hash('123456', 10)
    const ex = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(u.username)
    if (!ex) {
      sqlite.prepare(`
        INSERT INTO users (id, username, password, name, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uid, u.username, ph, u.name, u.role, 'active', now, now)
      console.log(`✅ 测试用户 ${u.name} 创建成功 (密码: 123456)`)
    }
  }

  sqlite.close()
}

seed().catch(console.error)
