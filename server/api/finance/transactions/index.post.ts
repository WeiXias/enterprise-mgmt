import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { financeTransactions } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0),
  category: z.string().min(1),
  transactionDate: z.string().min(1),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  contractId: z.string().optional(),
  projectId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const txId = generateId()
  const result = await db.insert(financeTransactions).values({
    id: txId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    category: parsed.data.category,
    sourceType: 'manual',
    sourceId: null,
    contractId: parsed.data.contractId || null,
    projectId: parsed.data.projectId || null,
    transactionDate: parsed.data.transactionDate,
    description: parsed.data.description || null,
    paymentMethod: parsed.data.paymentMethod || null,
    createdBy: user.userId,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'finance', targetId: txId, detail: '创建了财务流水' })
  return { code: 0, data: result[0], message: '搞定了！已登记' }
})
