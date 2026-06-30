import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { eq, like, and, isNull, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const category = query.category as string | undefined

  const where: any[] = [isNull(contractTemplates.deletedAt)]
  if (keyword) {
    where.push(like(contractTemplates.name, `%${keyword}%`))
  }
  if (category) {
    where.push(eq(contractTemplates.category, category))
  }

  const [list, totalResult] = await Promise.all([
    db.select({
      id: contractTemplates.id,
      name: contractTemplates.name,
      description: contractTemplates.description,
      category: contractTemplates.category,
      content: contractTemplates.content,
      placeholders: contractTemplates.placeholders,
      sortOrder: contractTemplates.sortOrder,
      createdBy: contractTemplates.createdBy,
      createdAt: contractTemplates.createdAt,
      updatedAt: contractTemplates.updatedAt,
    }).from(contractTemplates)
      .where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(contractTemplates.updatedAt)),
    db.select({ count: count() }).from(contractTemplates).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
