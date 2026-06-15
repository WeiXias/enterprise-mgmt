import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { customers, customerTags } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1, '客户名称不能为空').max(200).optional(),
  industry: z.string().optional(),
  registeredAddress: z.string().optional(),
  officeAddress: z.string().optional(),
  remark: z.string().optional(),
  status: z.enum(['potential', 'intentional', 'closed', 'lost']).optional(),
  ownerUserId: z.string().optional(),
  lostReason: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: customers.id, ownerUserId: customers.ownerUserId }).from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '客户不存在' })
  if (user.role === 'sales_member' && existing[0].ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '这个客户不是你负责的' })
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const { tagIds, ...updateFields } = parsed.data

  // 只更新有值的字段
  const updateData: Record<string, any> = { updatedAt: now }
  for (const [key, value] of Object.entries(updateFields)) {
    if (value !== undefined) updateData[key] = value
  }

  await db.update(customers).set(updateData).where(eq(customers.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'customer', targetId: id, detail: `更新了客户「${parsed.data.name}」` })

  // 更新标签
  if (tagIds !== undefined) {
    await db.delete(customerTags).where(eq(customerTags.customerId, id))
    if (tagIds.length > 0) {
      await db.insert(customerTags).values(tagIds.map(tagId => ({ customerId: id, tagId })))
    }
  }

  return { code: 0, data: null, message: '已保存，随时可以改' }
})
