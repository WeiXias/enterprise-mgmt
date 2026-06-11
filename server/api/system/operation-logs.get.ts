import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { operationLogs, users } from '#schema'
import { and, like, eq, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const conditions = []
  if (query.userId) conditions.push(eq(operationLogs.userId, query.userId as string))
  if (query.module) conditions.push(eq(operationLogs.module, query.module as string))
  if (query.action) conditions.push(eq(operationLogs.action, query.action as string))
  if (query.keyword) conditions.push(like(operationLogs.detail, `%${query.keyword as string}%`))
  if (query.startDate) conditions.push(sql`${operationLogs.createdAt} >= ${query.startDate as string}`)
  if (query.endDate) conditions.push(sql`${operationLogs.createdAt} <= ${query.endDate as string} || ' 23:59:59'`)

  const [list, totalResult] = await Promise.all([
    db.select({
      id: operationLogs.id,
      userId: operationLogs.userId,
      userName: users.name,
      action: operationLogs.action,
      module: operationLogs.module,
      recordId: operationLogs.targetId,
      detail: operationLogs.detail,
      ipAddress: operationLogs.ip,
      createdAt: operationLogs.createdAt,
    }).from(operationLogs)
      .leftJoin(users, eq(operationLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(operationLogs.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(operationLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})
