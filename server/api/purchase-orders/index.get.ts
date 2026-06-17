import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Math.min(Number(query.pageSize) || 20, 100)
    const supplierId = query.supplierId as string | undefined

    const whereParts = ["deleted_at IS NULL"]
    const params: any[] = []
    if (supplierId) { whereParts.push("supplier_id = ?"); params.push(supplierId) }
    const where = whereParts.join(" AND ")

    const totalRow = db.get(`SELECT count(*) as cnt FROM purchase_orders WHERE ${where}`, ...params) as { cnt: number } | undefined
    const total = Number(totalRow?.cnt || 0)

    const offset = (page - 1) * pageSize
    const list = db.all(`SELECT * FROM purchase_orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...params, pageSize, offset) as any[]

    return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
  } catch (err: any) {
    return { code: 500, data: null, message: err.message || '服务器错误' }
  }
})
