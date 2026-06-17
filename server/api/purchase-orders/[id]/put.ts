import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  supplierId: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const sets: string[] = []
  const params: any[] = []
  if (parsed.data.name !== undefined) { sets.push('name = ?'); params.push(parsed.data.name) }
  if (parsed.data.supplierId !== undefined) { sets.push('supplier_id = ?'); params.push(parsed.data.supplierId) }
  if (parsed.data.totalAmount !== undefined) { sets.push('total_amount = ?'); params.push(parsed.data.totalAmount) }
  if (parsed.data.status !== undefined) { sets.push('status = ?'); params.push(parsed.data.status) }
  if (parsed.data.remark !== undefined) { sets.push('remark = ?'); params.push(parsed.data.remark) }

  if (sets.length > 0) {
    const sqlite = new (require('better-sqlite3'))(process.env.DB_PATH || './data/enterprise.db')
    sqlite.pragma('foreign_keys = ON')
    const stmt = sqlite.prepare(`UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = ?`)
    stmt.run(...params, id)
    sqlite.close()
  }

  return { code: 0, data: null, message: '已保存' }
})
