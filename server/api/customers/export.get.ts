import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { customers } from '#schema'
import { and, isNull, sql, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const where: any[] = [isNull(customers.deletedAt)]
  if (user.role === 'sales_member') where.push(eq(customers.ownerUserId, user.userId))
  const list = await db.select().from(customers).where(and(...where)).orderBy(customers.createdAt)
  // 简化导出：返回 JSON，前端转 Excel
  return { code: 0, data: list }
})