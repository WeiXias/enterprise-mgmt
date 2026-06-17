import { defineEventHandler, readBody, createError } from 'h3'
import Database from 'better-sqlite3'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const DB_PATH = process.env.DB_PATH || './data/enterprise.db'

const schema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const code = parsed.data.code || `SUP-${id.slice(0, 8).toUpperCase()}`

  const sqlite = new Database(DB_PATH)
  sqlite.pragma('foreign_keys = ON')
  const stmt = sqlite.prepare(`INSERT INTO suppliers (id, name, code, contact_person, phone, address, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`)
  stmt.run(id, parsed.data.name, code, parsed.data.contactPerson, parsed.data.phone, parsed.data.address, parsed.data.remark)
  sqlite.close()

  return { code: 0, data: { id }, message: '搞定了！供应商已添加' }
})
