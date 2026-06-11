import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { detectCycle } from '#server-utils/task-deps'

const schema = z.object({
  parentId: z.string().nullable(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const { parentId } = parsed.data

  // 不能将自己设为前置任务
  if (parentId === id) {
    throw createError({ statusCode: 422, statusMessage: '不能将自己设为前置任务' })
  }

  // 检查任务是否存在
  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1)
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: '任务不存在' })
  }

  // 如果设置了 parentId，检查前置任务是否存在
  if (parentId) {
    const parent = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, parentId)).limit(1)
    if (parent.length === 0) {
      throw createError({ statusCode: 404, statusMessage: '前置任务不存在' })
    }
  }

  // 检测循环依赖
  if (parentId) {
    const allTasks = await db.select({ id: tasks.id, parentId: tasks.parentId }).from(tasks)
    if (detectCycle(allTasks, id, parentId)) {
      throw createError({ statusCode: 422, statusMessage: '不能设置循环依赖' })
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(tasks).set({ parentId, updatedAt: now }).where(eq(tasks.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'task', targetId: id, detail: '设置了任务依赖' })
  return { code: 0, data: null, message: '依赖已更新' }
})
