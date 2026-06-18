import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { aiProviders, aiEmployees } from '#schema/ai'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { createProvider, decryptApiKey } from '#ai-utils'
import { extractPlaceholders } from '#server-utils/contract-template'

const schema = z.object({
  prompt: z.string().min(10).max(1000),
  category: z.enum(['sales', 'procurement', 'service', 'other']).optional(),
  aiEmployeeId: z.string().optional(),
})

const GENERATE_SYSTEM_PROMPT_ADDON = `
请以 JSON 格式返回合同模板内容（不要包含 markdown 代码块标记）：

{
  "content": "合同正文 HTML",
  "suggestedName": "建议的模板名称",
  "suggestedDescription": "模板用途说明，一句话"
}

要求：
1. content 使用 HTML 格式：h2/h3 做标题层级，p 做段落，ul/ol/li 做列表
2. 变量字段用 {{key}} 占位符，常用变量包括：
   - {{partyA}} 甲方名称
   - {{partyB}} 乙方名称
   - {{customerName}} 客户名称
   - {{totalAmount}} 合同总金额
   - {{startDate}} 开始日期
   - {{endDate}} 结束日期
   - {{signingDate}} 签订日期
   - {{paymentMethod}} 付款方式
   - {{projectName}} 项目名称
   - {{projectScope}} 项目范围
3. 合同条款要涵盖核心法律要素：标的、价款、履行方式、违约责任、争议解决
4. 使用口语化、友好的中文表达，避免生硬的法律文书腔调`

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 选择 AI 员工
  let aiEmployee
  if (parsed.data.aiEmployeeId) {
    const rows = await db.select().from(aiEmployees)
      .where(and(eq(aiEmployees.id, parsed.data.aiEmployeeId), eq(aiEmployees.isActive, true)))
      .limit(1)
    if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'AI 员工不存在或已停用' })
    aiEmployee = rows[0]
  } else {
    const rows = await db.select().from(aiEmployees)
      .where(and(eq(aiEmployees.role, 'contract_writer'), eq(aiEmployees.isActive, true)))
      .limit(1)
    if (rows.length > 0) {
      aiEmployee = rows[0]
    } else {
      // 降级到合同审核员
      const reviewerRows = await db.select().from(aiEmployees)
        .where(and(eq(aiEmployees.role, 'contract_reviewer'), eq(aiEmployees.isActive, true)))
        .limit(1)
      if (reviewerRows.length > 0) {
        aiEmployee = reviewerRows[0]
      } else {
        // 再降级到任意活跃员工
        const anyRows = await db.select().from(aiEmployees)
          .where(eq(aiEmployees.isActive, true))
          .limit(1)
        if (anyRows.length === 0) {
          throw createError({ statusCode: 400, statusMessage: '没有可用的 AI 员工，请先去设置里创建一个' })
        }
        aiEmployee = anyRows[0]
      }
    }
  }

  // 获取供应商
  const providerRows = await db.select().from(aiProviders)
    .where(and(eq(aiProviders.id, aiEmployee!.providerId), eq(aiProviders.isEnabled, true)))
    .limit(1)
  if (providerRows.length === 0) throw createError({ statusCode: 400, statusMessage: 'AI 供应商不存在或已停用' })

  const provider = providerRows[0]
  const config = useRuntimeConfig()
  const apiKey = decryptApiKey(provider!.apiKey, config.aiEncryptionKey || config.jwtSecret)
  const aiProvider = createProvider({ type: provider!.type, baseUrl: provider.baseUrl, apiKey })

  const categoryLabel: Record<string, string> = {
    sales: '销售合同', procurement: '采购合同', service: '技术服务', other: '其他',
  }
  const categoryHint = parsed.data.category
    ? `合同分类：${categoryLabel[parsed.data.category] || parsed.data.category}。`
    : ''

  const userMessage = `请帮生成一份合同模板。

${categoryHint}
需求描述：${parsed.data.prompt}

请根据需求生成结构完整、条款规范的合同模板。`

  const response = await aiProvider.chat({
    messages: [
      { role: 'system', content: aiEmployee!.systemPrompt + '\n\n' + GENERATE_SYSTEM_PROMPT_ADDON },
      { role: 'user', content: userMessage },
    ],
    model: aiEmployee!.model,
    temperature: aiEmployee!.temperature,
    maxTokens: aiEmployee!.maxTokens,
  })

  // 解析 AI 响应
  let result: { content: string; suggestedName: string; suggestedDescription: string } | null = null
  try {
    result = JSON.parse(response.content.trim())
  } catch {
    const jsonMatch = response.content.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[1].trim())
      } catch { /* ignore */ }
    }
  }

  if (!result) {
    // 降级：把原始响应当作正文
    result = {
      content: response.content
        .replace(/<[^>]+>/g, '')
        .split('\n').filter((l: any) => l.trim()).map((l: any) => `<p>${l}</p>`).join('\n'),
      suggestedName: parsed.data.prompt.slice(0, 50),
      suggestedDescription: '',
    }
  }

  const placeholders = extractPlaceholders(result.content)

  return {
    code: 0,
    data: {
      content: result.content,
      placeholders,
      suggestedName: result.suggestedName || parsed.data.prompt.slice(0, 50),
      suggestedDescription: result.suggestedDescription || '',
    },
    message: '合同模板生成搞定！',
  }
})
