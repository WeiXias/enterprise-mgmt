import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1, '报价名称得填一下').optional().default('报价单'),
  validUntil: z.string().optional().or(z.literal('')),
  remark: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
  })).min(1, '至少选一个产品'),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: oppId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const items = parsed.data.items.map(p => {
    const discount = (p.discount ?? 100) / 100
    const subtotal = p.quantity * p.unitPrice * discount
    return { ...p, subtotal, discount }
  })
  const totalAmount = items.reduce((s, p) => s + p.subtotal, 0)

  const quoteId = generateId()
  await db.insert(quotes).values({
    id: quoteId,
    opportunityId: oppId as string,
    name: parsed.data.name || '报价单',
    totalAmount,
    status: 'draft',
    validUntil: parsed.data.validUntil || null,
    remark: parsed.data.remark || null,
    createdBy: user.userId,
  })

  await db.insert(quoteProducts).values(items.map(p => ({
    id: generateId(),
    quoteId,
    productId: p.productId,
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    discount: p.discount ?? 1.0,
  })))

  await logOperation(event, { action: 'CREATE', module: 'quote', targetId: quoteId, detail: `创建了报价「${parsed.data.name}」` })
  return { code: 0, data: { id: quoteId }, message: '报价已生成' }
})
