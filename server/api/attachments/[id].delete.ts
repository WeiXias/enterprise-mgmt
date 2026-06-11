import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contractAttachments.id }).from(contractAttachments).where(eq(contractAttachments.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '附件不存在' })
  await db.delete(contractAttachments).where(eq(contractAttachments.id, id))
  return { code: 0, data: null, message: '附件已删除' }
})
