import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import Database from 'better-sqlite3'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  taxId: z.string().optional(),
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
  if (parsed.data.code !== undefined) { sets.push('code = ?'); params.push(parsed.data.code) }
  if (parsed.data.contactPerson !== undefined) { sets.push('contact_person = ?'); params.push(parsed.data.contactPerson) }
  if (parsed.data.phone !== undefined) { sets.push('phone = ?'); params.push(parsed.data.phone) }
  if (parsed.data.email !== undefined) { sets.push('email = ?'); params.push(parsed.data.email) }
  if (parsed.data.address !== undefined) { sets.push('address = ?'); params.push(parsed.data.address) }
  if (parsed.data.bankName !== undefined) { sets.push('bank_name = ?'); params.push(parsed.data.bankName) }
  if (parsed.data.bankAccount !== undefined) { sets.push('bank_account = ?'); params.push(parsed.data.bankAccount) }
  if (parsed.data.taxId !== undefined) { sets.push('tax_id = ?'); params.push(parsed.data.taxId) }
  if (parsed.data.status !== undefined) { sets.push('status = ?'); params.push(parsed.data.status) }
  if (parsed.data.remark !== undefined) { sets.push('remark = ?'); params.push(parsed.data.remark) }

  if (sets.length > 0) {
    const sqlite = new Database(process.env.DB_PATH || './data/enterprise.db')
    sqlite.pragma('foreign_keys = ON')
    const stmt = sqlite.prepare(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`)
    stmt.run(...params, id)
    sqlite.close()
  }

  return { code: 0, data: null, message: '已保存' }
})
