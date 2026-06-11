import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders } from '#schema/ai'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { encryptApiKey } from '#ai-utils'

const schema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['deepseek', 'custom']),
  baseUrl: z.string().url('请输入有效的 URL'),
  apiKey: z.string().min(1),
  models: z.array(z.string()).default([]),
  isDefault: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const config = useRuntimeConfig()
  const encryptedKey = encryptApiKey(parsed.data.apiKey, config.aiEncryptionKey || config.jwtSecret)

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const id = generateId()

  // 如果设为默认，取消其他供应商的默认
  if (parsed.data.isDefault) {
    await db.update(aiProviders).set({ isDefault: false })
  }

  await db.insert(aiProviders).values({
    id,
    name: parsed.data.name,
    type: parsed.data.type,
    baseUrl: parsed.data.baseUrl,
    apiKey: encryptedKey,
    models: JSON.stringify(parsed.data.models),
    isDefault: parsed.data.isDefault,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'ai_employee', targetId: id, detail: `添加了模型供应商「${parsed.data.name}」` })

  return { code: 0, data: { id }, message: '供应商添加成功！' }
})
