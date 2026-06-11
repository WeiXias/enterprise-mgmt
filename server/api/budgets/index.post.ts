import { defineEventHandler, createError, readBody } from 'h3'
import { db } from '#database'
import { budgets, financeCategories } from '#schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  if (!body.name || !body.amount || !body.category) {
    throw createError({ statusCode: 400, statusMessage: '名称、金额和分类都得填' })
  }

  const id = generateId()
  await db.insert(budgets).values({
    id,
    name: body.name,
    year: body.year || new Date().getFullYear(),
    month: body.month || null,
    type: body.type || 'expense',
    category: body.category,
    amount: body.amount,
    projectId: body.projectId || null,
    departmentId: body.departmentId || null,
    remark: body.remark || null,
    createdBy: user.userId,
  })

  return { code: 0, data: { id }, message: '预算已创建' }
})
