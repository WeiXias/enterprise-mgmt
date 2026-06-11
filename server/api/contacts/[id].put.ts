import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contacts } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  position: z.string().optional(),
  wechat: z.string().optional(),
  isPrimary: z.boolean().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: contacts.id, customerId: contacts.customerId }).from(contacts).where(and(eq(contacts.id, id), isNull(contacts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '联系人不存在' })

  const now = new Date()
  if (parsed.data.isPrimary) {
    await db.update(contacts).set({ isPrimary: false, updatedAt: now }).where(eq(contacts.customerId, existing[0].customerId))
  }
  const result = await db.update(contacts).set({ ...parsed.data, updatedAt: now }).where(eq(contacts.id, id)).returning()
  await logOperation(event, { action: 'UPDATE', module: 'contact', targetId: id, detail: `更新了联系人「${parsed.data.name}」` })
  return { code: 0, data: result[0], message: '已保存' }
})
