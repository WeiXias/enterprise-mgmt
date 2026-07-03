import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const entrySchema = z.object({
  accountId: z.string().min(1),
  summary: z.string().optional(),
  debitAmount: z.number().int().default(0),
  creditAmount: z.number().int().default(0),
  contractId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
})

const schema = z.object({
  voucherDate: z.string().min(1).optional(),
  summary: z.string().optional(),
  entries: z.array(entrySchema).min(2).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ status: vouchers.status }).from(vouchers).where(eq(vouchers.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '凭证不存在' })
  if (existing[0].status !== 'draft') throw createError({ statusCode: 403, statusMessage: '只能修改草稿状态的凭证' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updates: Record<string, any> = { updatedAt: now }
  if (parsed.data.voucherDate !== undefined) updates.voucherDate = parsed.data.voucherDate
  if (parsed.data.summary !== undefined) updates.summary = parsed.data.summary

  if (Object.keys(updates).length > 1) {
    await db.update(vouchers).set(updates).where(eq(vouchers.id, id))
  }

  // 如果提供了分录，删除旧分录重新插入
  if (parsed.data.entries) {
    // 借贷平衡校验
    let totalDebit = 0, totalCredit = 0
    for (const e of parsed.data.entries) { totalDebit += e.debitAmount; totalCredit += e.creditAmount }
    if (totalDebit !== totalCredit || totalDebit === 0) {
      throw createError({ statusCode: 422, statusMessage: `借贷不平衡：借方 ${totalDebit}，贷方 ${totalCredit}` })
    }

    // 删除旧分录
    await db.delete(voucherEntries).where(eq(voucherEntries.voucherId, id))

    for (let i = 0; i < parsed.data.entries.length; i++) {
      const e = parsed.data.entries[i]
      await db.insert(voucherEntries).values({
        id: generateId(),
        voucherId: id,
        accountId: e.accountId,
        summary: e.summary || parsed.data.summary || null,
        debitAmount: e.debitAmount,
        creditAmount: e.creditAmount,
        contractId: e.contractId || null,
        projectId: e.projectId || null,
        customerId: e.customerId || null,
        supplierId: e.supplierId || null,
        sort: i,
        createdAt: now,
      } as any)
    }
  }

  await logOperation(event, { action: 'UPDATE', module: 'accounting', targetId: id, detail: '修改凭证' })
  return { code: 0, message: '已保存' }
})
