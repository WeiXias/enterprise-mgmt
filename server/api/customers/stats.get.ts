import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, users } from '#schema'
import { eq, and, isNull, count, ne } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const where: any[] = [isNull(customers.deletedAt)]
  if (user.role === 'sales_member') where.push(eq(customers.ownerUserId, user.userId))

  const [statusRows, ownerRows, industryRows] = await Promise.all([
    db.select({ status: customers.status, count: count() }).from(customers)
      .where(and(...where)).groupBy(customers.status),
    db.select({ ownerUserId: customers.ownerUserId, count: count(), name: users.name }).from(customers)
      .leftJoin(users, eq(customers.ownerUserId, users.id))
      .where(and(...where)).groupBy(customers.ownerUserId, users.name),
    db.select({ industry: customers.industry, count: count() }).from(customers)
      .where(and(...where, ne(customers.industry, ''))).groupBy(customers.industry),
  ])

  return {
    code: 0,
    data: {
      byStatus: statusRows.map((r: any) => ({ status: r.status, count: Number(r.count) })),
      byOwner: ownerRows.map((r: any) => ({ ownerId: r.ownerUserId, name: r.name, count: Number(r.count) })),
      byIndustry: industryRows.filter((r: any) => r.industry).map((r: any) => ({ industry: r.industry, count: Number(r.count) })),
    }
  }
})
