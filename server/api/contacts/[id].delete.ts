import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contacts } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, id), isNull(contacts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '联系人不存在' })

  await db.update(contacts).set({ deletedAt: new Date().toISOString() }).where(eq(contacts.id, id))
  await logOperation(event, { action: 'DELETE', module: 'contact', targetId: id, detail: '删除了联系人' })
  return { code: 0, data: null, message: '联系人已删除' }
})
