import { defineEventHandler } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders } from '#schema/ai'
import { eq, isNull } from 'drizzle-orm'

type ProviderRow = typeof aiProviders.$inferSelect

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const list = await db.select().from(aiProviders)
    .orderBy(() => aiProviders.createdAt)

  return {
    code: 0,
    data: list.map((p: ProviderRow) => ({
      ...p,
      apiKey: undefined, // 不返回 API Key
      models: JSON.parse(p.models || '[]'),
    })),
  }
})
