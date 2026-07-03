import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, contractProducts, paymentPlans } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  type: z.enum(['sales', 'purchase']).optional().default('sales'),
  direction: z.enum(['income', 'expense']).optional().default('income'),
  opportunityId: z.string().optional(),
  ownerUserId: z.string().optional(),
  totalAmount: z.number().min(0),
  partyA: z.string().optional().default(''),
  partyB: z.string().optional().default(''),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  remark: z.string().optional(),
  content: z.string().optional(),
  products: z.array(z.object({
    productId: z.string(), quantity: z.number().min(1),
    unitPrice: z.number().min(0), discount: z.number().min(0).max(1).optional()
  })).optional(),
  plans: z.array(z.object({
    amount: z.number().min(0), planDate: z.string(), remark: z.string().optional()
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const contractId = generateId()
  const codeNo = `C-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  await db.transaction(async (tx) => {
    await tx.insert(contracts).values({
      id: contractId,
      code: codeNo,
      name: parsed.data.name,
      customerId: parsed.data.customerId || null,
      supplierId: parsed.data.supplierId || null,
      type: parsed.data.type,
      direction: parsed.data.direction,
      opportunityId: parsed.data.opportunityId || null,
      totalAmount: parsed.data.totalAmount,
      partyA: parsed.data.partyA || '',
      partyB: parsed.data.partyB || '',
      content: parsed.data.content || '',
      paymentMethod: parsed.data.paymentMethod || null,
      startDate: parsed.data.startDate || null,
      endDate: parsed.data.endDate || null,
      status: 'draft',
      ownerUserId: parsed.data.ownerUserId || user.userId,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    })

    // 关联产品
    if (parsed.data.products?.length) {
      await tx.insert(contractProducts).values(
        parsed.data.products.map(p => ({
          id: generateId(),
          contractId,
          productId: p.productId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          discount: p.discount ?? 1.0,
        }))
      )
    }

    // 收款计划
    if (parsed.data.plans?.length) {
      await tx.insert(paymentPlans).values(
        parsed.data.plans.map(p => ({
          id: generateId(),
          contractId,
          amount: p.amount,
          planDate: p.planDate,
          remark: p.remark || null,
          status: 'pending',
          createdAt: now,
        }))
      )
    }
  })

  await logOperation(event, { action: 'CREATE', module: 'contract', targetId: contractId, detail: `创建了合同「${parsed.data.name}」` })

  return { code: 0, data: { id: contractId }, message: '搞定了！合同已创建' }
})
