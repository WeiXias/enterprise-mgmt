import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { commissions } from '#schema'
import { eq } from 'drizzle-orm'
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
  await db.update(commissions).set({
    adjustAmount: parsed.data.adjustAmount,
    adjustReason: parsed.data.adjustReason,
  }).where(eq(commissions.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'commission', targetId: id, detail: '调整了提成金额' })
  return { code: 0, data: null, message: '提成已调整' }
})
