import { defineEventHandler, createError, readBody } from 'h3'
import { db } from '#database'
import { budgets, financeCategories } from '#schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  amount: z.number().min(0, '金额不能为负'),
  category: z.string().min(1, '分类不能为空'),
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
  type: z.enum(['income', 'expense']).optional(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { name, year, month, type, category, amount, projectId, departmentId, remark } = parsed.data

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
