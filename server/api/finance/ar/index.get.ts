import { defineEventHandler, getQuery, createError } from 'h3'
import { rawDb } from '#database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string || ''
  const overdue = query.overdue as string || ''

  const params: any[] = []

  let whereSQL = `WHERE pp.deleted_at IS NULL AND pp.status IN ('pending', 'overdue') AND ct.deleted_at IS NULL AND cu.deleted_at IS NULL`
  if (keyword) {
    whereSQL += ` AND (cu.name LIKE ? OR ct.name LIKE ?)`
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (overdue === 'yes') {
    whereSQL += ` AND pp.status = 'overdue'`
  } else if (overdue === 'no') {
    whereSQL += ` AND pp.status = 'pending'`
  }

  // Count
  const countSQL = `SELECT COUNT(*) as total FROM payment_plans pp JOIN contracts ct ON ct.id = pp.contract_id JOIN customers cu ON cu.id = ct.customer_id ${whereSQL}`
  const countRow = rawDb.prepare(countSQL).get(...params) as any
  const total = countRow?.total || 0

  // Data
  const dataParams = [...params, pageSize, (page - 1) * pageSize]
  const dataSQL = `SELECT pp.id, cu.name as customerName, ct.name as contractName, pp.amount, pp.plan_date as planDate, pp.status, julianday('now') - julianday(pp.plan_date) as overdueDays FROM payment_plans pp JOIN contracts ct ON ct.id = pp.contract_id JOIN customers cu ON cu.id = ct.customer_id ${whereSQL} ORDER BY pp.plan_date ASC LIMIT ? OFFSET ?`
  const rows = rawDb.prepare(dataSQL).all(...dataParams) as any[]

  return {
    code: 0,
    data: {
      items: rows.map((r: any) => ({ ...r, amount: Number(r.amount), overdueDays: Math.floor(Number(r.overdueDays || 0)) })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
