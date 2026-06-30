import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { customers } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:delete')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  if (user.role === 'sales_member') throw createError({ statusCode: 403, statusMessage: '销售成员不能删除客户' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: customers.id, ownerUserId: customers.ownerUserId }).from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '客户不存在' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(customers).set({ deletedAt: now }).where(eq(customers.id, id))
  await logOperation(event, { action: 'DELETE', module: 'customer', targetId: id, detail: '删除了客户' })
  return { code: 0, data: null, message: '已删除' }
})
