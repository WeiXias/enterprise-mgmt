import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { commissions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ adjustAmount: z.number().min(0), adjustReason: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'commission:adjust')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: commissions.id, status: commissions.status }).from(commissions)
    .where(and(eq(commissions.id, id), isNull(commissions.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '提成记录不存在' })
  if (existing[0].status === 'paid') throw createError({ statusCode: 400, statusMessage: '已发放的提成不能再调整' })

  await db.update(commissions).set({
    adjustAmount: parsed.data.adjustAmount,
    adjustReason: parsed.data.adjustReason,
  }).where(eq(commissions.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'commission', targetId: id, detail: '调整了提成金额' })
  return { code: 0, data: null, message: '提成已调整' }
})
