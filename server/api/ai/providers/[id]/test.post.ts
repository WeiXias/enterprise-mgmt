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
  const apiKey = decryptApiKey(provider.apiKey, config.aiEncryptionKey || config.jwtSecret)

  try {
    const aiProvider = createProvider({ type: provider.type, baseUrl: provider.baseUrl, apiKey })
    const ok = await aiProvider.testConnection()
    if (ok) {
      return { code: 0, data: { success: true }, message: '连接成功！' }
    } else {
      return { code: 0, data: { success: false }, message: '连接失败，请检查配置' }
    }
  } catch (e: any) {
    return { code: 0, data: { success: false }, message: e.message || '连接失败' }
  }
})
