import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, opportunities, todos } from '#schema'
import { eq, and, isNull, ne, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'user:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const [customersResult, oppsResult, todosResult] = await Promise.all([
    db.select({ count: count() }).from(customers).where(
      and(eq(customers.ownerUserId, user.userId), isNull(customers.deletedAt)),
    ),
    db.select({ count: count() }).from(opportunities).where(
      and(
        eq(opportunities.ownerUserId, user.userId),
        isNull(opportunities.deletedAt),
        ne(opportunities.status, 'closed_won'),
        ne(opportunities.status, 'closed_lost'),
      ),
    ),
    db.select({ count: count() }).from(todos).where(
      and(eq(todos.userId, user.userId), isNull(todos.deletedAt), ne(todos.status, 'completed')),
    ),
  ])

  return {
    code: 0,
    data: {
      customerCount: Number(customersResult[0]?.count || 0),
      opportunityCount: Number(oppsResult[0]?.count || 0),
      todoPendingCount: Number(todosResult[0]?.count || 0),
    },
  }
})
