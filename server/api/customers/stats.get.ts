import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { customers, users } from '#schema'
import { eq, and, isNull, count, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const where: any[] = [isNull(customers.deletedAt)]
  if (user.role === 'sales') where.push(eq(customers.ownerId, user.userId))

  const [statusRows, ownerRows, industryRows] = await Promise.all([
    db.select({ status: customers.status, count: count() }).from(customers)
      .where(and(...where)).groupBy(customers.status),
    db.select({ ownerId: customers.ownerId, count: count(), name: users.name }).from(customers)
      .leftJoin(users, eq(customers.ownerId, users.id))
      .where(and(...where)).groupBy(customers.ownerId, users.name),
    db.select({ industry: customers.industry, count: count() }).from(customers)
      .where(and(...where, eq(customers.industry, ''))).groupBy(customers.industry),
  ])

  return {
    code: 0,
    data: {
      byStatus: statusRows.map((r: any) => ({ status: r.status, count: Number(r.count) })),
      byOwner: ownerRows.map((r: any) => ({ ownerId: r.ownerId, name: r.name, count: Number(r.count) })),
      byIndustry: industryRows.filter((r: any) => r.industry).map((r: any) => ({ industry: r.industry, count: Number(r.count) })),
    }
  }
})
