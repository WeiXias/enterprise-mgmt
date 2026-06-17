import { defineEventHandler, createError } from 'h3'
import { db, rawDb } from '#database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const buckets = [
    { bucket: 'current', label: '未逾期', min: -99999, max: 0 },
    { bucket: '0-30', label: '逾期 ≤30 天', min: 1, max: 30 },
    { bucket: '31-60', label: '逾期 31~60 天', min: 31, max: 60 },
    { bucket: '61-90', label: '逾期 61~90 天', min: 61, max: 90 },
    { bucket: '>90', label: '逾期 >90 天', min: 91, max: 99999 },
  ]

  const results: any[] = []
  let totalAmount = 0
  let totalCount = 0

  for (const b of buckets) {
    const stmt = rawDb.prepare(
      `SELECT
         COUNT(DISTINCT ct.customer_id) as customerCount,
         COUNT(*) as count,
         COALESCE(SUM(pp.amount), 0) as amount
       FROM payment_plans pp
       JOIN contracts ct ON ct.id = pp.contract_id
       WHERE pp.deleted_at IS NULL
         AND pp.status IN ('pending', 'overdue')
         AND ct.deleted_at IS NULL
         AND (julianday('now') - julianday(pp.plan_date)) >= ?
         AND (julianday('now') - julianday(pp.plan_date)) <= ?`
    )
    const row = stmt.get(b.min, b.max) as any

    const bucketAmount = Number(row?.amount || 0)
    results.push({
      bucket: b.bucket,
      label: b.label,
      customerCount: row?.customerCount || 0,
      count: row?.count || 0,
      amount: bucketAmount,
    })
    totalAmount += bucketAmount
    totalCount += (row?.count || 0)
  }

  return {
    code: 0,
    data: { totalAmount, totalCount, buckets: results },
  }
})
