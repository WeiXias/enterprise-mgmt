import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ lostReason: z.string().min(1, '输单原因还没填呢') })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({
    id: opportunities.id,
    status: opportunities.status,
  }).from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })
  if (existing[0].status === 'closed_won' || existing[0].status === 'closed_lost') {
    throw createError({ statusCode: 400, statusMessage: '已经决单了' })
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.update(opportunities).set({ status: 'closed_lost', lostReason: parsed.data.lostReason, updatedAt: now }).where(eq(opportunities.id, id))
  await logOperation(event, { action: 'REJECT', module: 'opportunity', targetId: id, detail: `商机输单，原因：${parsed.data.lostReason}` })
  return { code: 0, data: null, message: '没关系，下次再努力' }
})
