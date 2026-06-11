import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { encryptApiKey } from '#ai-utils'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  baseUrl: z.string().url('请输入有效的 URL').optional(),
  apiKey: z.string().min(1).optional(),
  models: z.array(z.string()).min(1).optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: aiProviders.id }).from(aiProviders).where(eq(aiProviders.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const config = useRuntimeConfig()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, any> = { updatedAt: now }

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.baseUrl !== undefined) updateData.baseUrl = parsed.data.baseUrl
  if (parsed.data.apiKey !== undefined) updateData.apiKey = encryptApiKey(parsed.data.apiKey, config.aiEncryptionKey || config.jwtSecret)
  if (parsed.data.models !== undefined) updateData.models = JSON.stringify(parsed.data.models)
  if (parsed.data.isDefault !== undefined) updateData.isDefault = parsed.data.isDefault
  if (parsed.data.isEnabled !== undefined) updateData.isEnabled = parsed.data.isEnabled

  if (parsed.data.isDefault) {
    await db.update(aiProviders).set({ isDefault: false })
  }

  await db.update(aiProviders).set(updateData).where(eq(aiProviders.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'ai_employee', targetId: id, detail: '更新了模型供应商' })

  return { code: 0, data: null, message: '供应商已更新' }
})
