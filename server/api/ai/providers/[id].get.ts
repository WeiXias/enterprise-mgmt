import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders } from '#schema/ai'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const rows = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1)
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  const provider = rows[0]
  return {
    code: 0,
    data: {
      ...provider,
      apiKey: undefined,
      models: JSON.parse(provider!.models || '[]'),
    },
  }
})
