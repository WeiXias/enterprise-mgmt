import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { commissionPayouts, commissionPayoutItems, commissions } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ commissionIds: z.array(z.string()).min(1), periodMonth: z.string() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:manage')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const payoutId = generateId()

  // Calculate total from commissions
  let totalAmount = 0
  for (const cid of parsed.data.commissionIds) {
    const result = await db.select({ amount: commissions.amount, adjustAmount: commissions.adjustAmount, userId: commissions.userId })
      .from(commissions).where(eq(commissions.id, cid)).limit(1)
    if (result.length > 0) {
      const amt = Number(result[0].adjustAmount) || Number(result[0].amount)
      totalAmount += amt
    }
  }

  await db.insert(commissionPayouts).values({
    id: payoutId,
    periodMonth: parsed.data.periodMonth,
    totalAmount,
    status: 'draft',
    createdBy: user.userId,
    createdAt: now,
  })

  for (const cid of parsed.data.commissionIds) {
    const result = await db.select({ amount: commissions.amount, adjustAmount: commissions.adjustAmount, userId: commissions.userId })
      .from(commissions).where(eq(commissions.id, cid)).limit(1)
    if (result.length > 0) {
      const amt = Number(result[0].adjustAmount) || Number(result[0].amount)
      await db.insert(commissionPayoutItems).values({
        id: generateId(),
        payoutId,
        commissionId: cid,
        userId: result[0].userId,
        amount: amt,
      })
      // Mark commission as paid
      await db.update(commissions).set({ status: 'paid' }).where(eq(commissions.id, cid))
    }
  }

  await logOperation(event, { action: 'CREATE', module: 'payout', targetId: payoutId, detail: '创建了提成发放' })
  return { code: 0, data: { id: payoutId }, message: '发放单已创建' }
})
