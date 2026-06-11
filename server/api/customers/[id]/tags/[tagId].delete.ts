import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { customerTags } from '#schema/customers'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id, tagId } = getRouterParams(event)
  await db.delete(customerTags).where(and(eq(customerTags.customerId, id), eq(customerTags.tagId, tagId)))
  await logOperation(event, { action: 'DELETE', module: 'tag', targetId: id, detail: '移除了客户标签' })
  return { code: 0, data: null, message: '标签已移除' }
})