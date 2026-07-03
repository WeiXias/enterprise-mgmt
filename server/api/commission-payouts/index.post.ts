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

  // 提前读取提成数据（事务外可读）
  const commissionRows: Array<{ id: string; amount: number; adjustAmount: number | null; userId: string }> = []
  for (const cid of parsed.data.commissionIds) {
    const result = await db.select({ id: commissions.id, amount: commissions.amount, adjustAmount: commissions.adjustAmount, userId: commissions.userId })
      .from(commissions).where(eq(commissions.id, cid)).limit(1)
    if (result.length > 0) commissionRows.push(result[0] as any)
  }

  let totalAmount = 0
  for (const r of commissionRows) {
    totalAmount += Number(r.adjustAmount) || Number(r.amount)
  }

  await db.transaction(async (tx) => {
    await tx.insert(commissionPayouts).values({
      id: payoutId,
      periodMonth: parsed.data.periodMonth,
      totalAmount,
      status: 'draft',
      createdBy: user.userId,
      createdAt: now,
    })

    for (const r of commissionRows) {
      const amt = Number(r.adjustAmount) || Number(r.amount)
      await tx.insert(commissionPayoutItems).values({
        id: generateId(),
        payoutId,
        commissionId: r.id,
        userId: r.userId,
        amount: amt,
      })
      // Mark commission as paid
      await tx.update(commissions).set({ status: 'paid' }).where(eq(commissions.id, r.id))
    }
  })

  await logOperation(event, { action: 'CREATE', module: 'payout', targetId: payoutId, detail: '创建了提成发放' })
  return { code: 0, data: { id: payoutId }, message: '发放单已创建' }
})
