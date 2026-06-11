import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { db } from '#database'
import { budgets } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少预算ID' })

  const body = await readBody(event)
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.amount !== undefined) updateData.amount = body.amount
  if (body.category !== undefined) updateData.category = body.category
  if (body.type !== undefined) updateData.type = body.type
  if (body.year !== undefined) updateData.year = body.year
  if (body.month !== undefined) updateData.month = body.month
  if (body.projectId !== undefined) updateData.projectId = body.projectId
  if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
  if (body.remark !== undefined) updateData.remark = body.remark
  updateData.updatedAt = new Date().toISOString()

  await db.update(budgets).set(updateData).where(eq(budgets.id, id))
  return { code: 0, data: null, message: '已保存' }
})
