import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const isSalesMember = user.role === 'sales_member'
  const ownerWhere = isSalesMember ? eq(opportunities.ownerUserId, user.userId) : undefined

  const stages = ['initial_contact', 'requirement_confirmed', 'proposal_submitted', 'business_negotiation', 'closed_won', 'closed_lost'] as const
  const rows = await Promise.all(stages.map(async (s) => {
    const result = await db.select({ c: sql<number>`count(*)` }).from(opportunities)
      .where(and(
        eq(opportunities.status, s),
        isNull(opportunities.deletedAt),
        ownerWhere,
      ))
    return { status: s, count: Number(result[0]?.c || 0) }
  }))
  const total = rows.reduce((a, b) => a + b.count, 0)
  const won = rows.find(r => r.status === 'closed_won')?.count || 0
  return {
    code: 0,
    data: { stages: rows, total, winRate: total > 0 ? Math.round(won / total * 100) : 0 }
  }
})
