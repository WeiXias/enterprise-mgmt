import { defineEventHandler, readBody, createError } from 'h3'
import Database from 'better-sqlite3'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  name: z.string().min(1).max(200).optional().default(''),
  supplierId: z.string().optional(),
  totalAmount: z.number().min(0).optional().default(0),
  remark: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const sqlite = new Database(process.env.DB_PATH || './data/enterprise.db')
  sqlite.pragma('foreign_keys = ON')
  sqlite.prepare(`INSERT INTO purchase_orders (id, name, supplier_id, total_amount, remark, status) VALUES (?, ?, ?, ?, ?, 'draft')`)
    .run(id, parsed.data.name, parsed.data.supplierId, parsed.data.totalAmount, parsed.data.remark)
  sqlite.close()
  return { code: 0, data: { id }, message: '采购订单已创建' }
})
