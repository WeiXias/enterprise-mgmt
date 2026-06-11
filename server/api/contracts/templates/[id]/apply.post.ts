import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contractTemplates, contracts, customers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const schema = z.object({
  contractId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 获取模板
  const tmplResult = await db.select().from(contractTemplates)
    .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)))
    .limit(1)
  if (tmplResult.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })

  const tmpl = tmplResult[0]

  // 获取合同及客户信息用于占位符替换
  const contractResult = await db.select().from(contracts)
    .where(and(eq(contracts.id, parsed.data.contractId), isNull(contracts.deletedAt)))
    .limit(1)
  if (contractResult.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = contractResult[0]

  // 获取客户名
  let customerName = ''
  const customerResult = await db.select({ name: customers.name }).from(customers)
    .where(eq(customers.id, c.customerId)).limit(1)
  if (customerResult.length > 0) customerName = customerResult[0].name

  // 构建替换映射
  const replacements: Record<string, string> = {
    partyA: c.partyA || '',
    partyB: c.partyB || '',
    customerName,
    totalAmount: c.totalAmount ? `¥${c.totalAmount.toLocaleString('zh-CN')}` : '',
    startDate: c.startDate || '',
    endDate: c.endDate || '',
    paymentMethod: c.paymentMethod || '',
  }

  // 占位符替换
  let content = tmpl.content || ''
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`)
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contracts).set({ content, updatedAt: now })
    .where(eq(contracts.id, parsed.data.contractId))

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: parsed.data.contractId, detail: `应用了模板「${tmpl.name}」生成合同正文` })

  return { code: 0, data: { content }, message: '模板已应用' }
})
