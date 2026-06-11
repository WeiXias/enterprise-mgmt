import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contacts } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contacts.id, customerId: contacts.customerId }).from(contacts).where(and(eq(contacts.id, id), isNull(contacts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '联系人不存在' })

  const now = new Date()
  await db.update(contacts).set({ isPrimary: false, updatedAt: now }).where(eq(contacts.customerId, existing[0].customerId))
  await db.update(contacts).set({ isPrimary: true, updatedAt: now }).where(eq(contacts.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'contact', targetId: id, detail: '设置了首要联系人' })
  return { code: 0, data: null, message: '已设为主要联系人' }
})
