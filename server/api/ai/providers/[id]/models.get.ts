import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { createProvider, decryptApiKey } from '#ai-utils'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const rows = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1)
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  const provider = rows[0]
  const config = useRuntimeConfig()
  const apiKey = decryptApiKey(provider!.apiKey, config.aiEncryptionKey || config.jwtSecret)

  try {
    const aiProvider = createProvider({ type: provider!.type, baseUrl: provider.baseUrl, apiKey })
    const models = await aiProvider.listModels()
    return { code: 0, data: models }
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `获取模型列表失败：${e.message || '未知错误'}` })
  }
})
