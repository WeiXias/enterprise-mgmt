import { defineEventHandler, getQuery, createError } from 'h3'
import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Math.min(Number(query.pageSize) || 20, 100)
    const status = query.status as string | undefined

    const sqlite = new Database(process.env.DB_PATH || './data/enterprise.db')
    sqlite.pragma('foreign_keys = ON')

    let where = "deleted_at IS NULL"
    const params: any[] = []
    if (status) {
      where += " AND status = ?"
      params.push(status)
    }

    const countRow = sqlite.prepare(`SELECT count(*) as cnt FROM suppliers WHERE ${where}`).get(...params) as { cnt: number }
    const total = Number(countRow?.cnt || 0)
    const offset = (page - 1) * pageSize

    const rows = sqlite.prepare(
      `SELECT id, name, code, contact_person, phone, address, status, remark, created_at, updated_at FROM suppliers WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as any[]

    sqlite.close()

    const items = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      contactPerson: r.contact_person || '',
      phone: r.phone || '',
      address: r.address || '',
      status: r.status,
      remark: r.remark || '',
      createdAt: r.created_at || '',
      updatedAt: r.updated_at || '',
    }))

    return { code: 0, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
  } catch (err: any) {
    return { code: 500, data: null, message: err.message || '服务器错误' }
  }
})
