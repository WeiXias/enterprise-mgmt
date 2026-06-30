import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { customerTags, customers } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:delete')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id, tagId } = getRouterParams(event)

  // 校验客户存在，且 sales_member 只能操作自己负责的客户
  const [customer] = await db.select({ id: customers.id, ownerUserId: customers.ownerUserId }).from(customers).where(and(eq(customers.id, id), isNull(customers.deletedAt)))
  if (!customer) throw createError({ statusCode: 404, statusMessage: '客户不存在' })
  if (user.role === 'sales_member' && customer.ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '没有权限操作此客户' })
  }

  await db.delete(customerTags).where(and(eq(customerTags.customerId, id), eq(customerTags.tagId, tagId)))
  await logOperation(event, { action: 'DELETE', targetId: id, detail: '移除了客户标签' })
  return { code: 0, data: null, message: '标签已移除' }
})
