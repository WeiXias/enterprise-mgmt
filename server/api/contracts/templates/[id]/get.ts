import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const result = await db.select().from(contractTemplates)
    .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)))
    .limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })
  return { code: 0, data: result[0] }
})
