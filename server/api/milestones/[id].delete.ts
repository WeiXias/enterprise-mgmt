import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { milestones } from '#schema/projects'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: milestones.id }).from(milestones)
    .where(and(eq(milestones.id, id), isNull(milestones.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '里程碑不存在' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(milestones).set({ deletedAt: now }).where(eq(milestones.id, id))
  await logOperation(event, { action: 'DELETE', module: 'milestone', targetId: id, detail: '删除了里程碑' })
  return { code: 0, data: null, message: '已删除' }
})
