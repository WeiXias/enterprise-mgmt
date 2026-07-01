import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { generateId } from '#server-utils/id'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const createSchema = z.object({
  invoiceNo: z.string().min(1, '发票号不能为空'),
  type: z.string().optional(),
  contractId: z.string().optional(),
  customerId: z.string().optional(),
  amount: z.number().min(0, '金额不能为负'),
  taxRate: z.number().min(0).optional(),
  issuedAt: z.string().optional(),
  dueDate: z.string().optional(),
  remark: z.string().optional(),
  filePath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'invoice:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { invoiceNo, type, contractId, customerId, amount, taxRate, issuedAt, dueDate, remark, filePath } = parsed.data
  if (!invoiceNo || !amount) throw createError({ statusCode: 422, statusMessage: '发票号和金额不能为空' })

  // 税额 = 价税合计 - 不含税金额 = amount - amount/(1 + taxRate/100)
  const exTax = Math.round(amount / (1 + (taxRate || 0) / 100))
  const taxAmount = amount - exTax

  const result = await db.insert(invoices).values({
    id: generateId(),
    invoiceNo: invoiceNo || `FP-${Date.now()}`,
    type: type || 'vat_normal',
    contractId, customerId,
    amount: amount || 0,
    taxRate: taxRate || 0,
    taxAmount,
    issuedAt, dueDate, remark,
    filePath,
    createdBy: user.userId,
  }).returning()

  return { code: 0, data: result[0], message: '发票已创建' }
})
