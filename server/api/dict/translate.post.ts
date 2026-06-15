import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { aiProviders, aiEmployees } from '#schema/ai'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { createProvider, decryptApiKey } from '#ai-utils'

const schema = z.object({
  text: z.string().min(1, '要翻译的文本不能为空'),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { text } = parsed.data

  // 找一个激活的 AI 员工
  const employeeRows = await db.select().from(aiEmployees)
    .where(and(eq(aiEmployees.isActive, true), isNull(aiEmployees.deletedAt)))
    .limit(1)

  if (employeeRows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '请先在设置里配置 AI 供应商和数字员工' })
  }

  const employee = employeeRows[0]!

  // 找对应供应商
  const providerRows = await db.select().from(aiProviders)
    .where(and(eq(aiProviders.id, employee.providerId), eq(aiProviders.isEnabled, true), isNull(aiProviders.deletedAt)))
    .limit(1)

  if (providerRows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'AI 供应商已停用，请先去设置里检查' })
  }

  const provider = providerRows[0]!

  // 解密密钥并创建供应商
  const config = useRuntimeConfig()
  const apiKey = decryptApiKey(provider.apiKey, config.aiEncryptionKey || config.jwtSecret)
  const aiProvider = createProvider({ type: provider.type, baseUrl: provider.baseUrl, apiKey })

  const response = await aiProvider.chat({
    messages: [
      {
        role: 'system',
        content: '你是一个翻译助手。将用户输入的中文翻译成简短英文标识，使用 snake_case 格式（小写字母+下划线）。只返回翻译结果，不要加任何解释、标点或额外内容。',
      },
      { role: 'user', content: text },
    ],
    model: employee.model,
    temperature: 0.3,
    maxTokens: 200,
  })

  return {
    code: 0,
    data: { translated: response.content.trim() },
  }
})
