import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema/projects'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ items: z.array(z.object({ id: z.string(), sortOrder: z.number() })) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  for (const item of parsed.data.items) {
    await db.update(tasks).set({ sortOrder: item.sortOrder, updatedAt: new Date() }).where(eq(tasks.id, item.id))
  }
  await logOperation(event, { action: 'UPDATE', module: 'task', detail: '调整了任务排序' })
  return { code: 0, data: null, message: '顺序已更新' }
})