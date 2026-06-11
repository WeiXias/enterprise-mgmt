import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { projects } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(projects).set({ deletedAt: now, updatedAt: now }).where(eq(projects.id, id))
  await logOperation(event, { action: 'DELETE', module: 'project', targetId: id, detail: '删除了项目' })
  return { code: 0, data: null, message: '项目已删除' }
})
