import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '任务不存在' })
  await db.delete(tasks).where(eq(tasks.id, id))
  await logOperation(event, { action: 'DELETE', module: 'task', targetId: id, detail: '删除了任务' })
  return { code: 0, data: null, message: '任务已删除' }
})
