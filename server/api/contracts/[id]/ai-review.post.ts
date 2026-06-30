import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { aiProviders, aiEmployees, aiReviews } from '#schema/ai'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { createProvider, decryptApiKey } from '#ai-utils'
import type { AIReviewResult } from '#ai-utils'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  aiEmployeeId: z.string().optional(),
})

function stripHtml(html: string): string {
  // 简单的 HTML 转纯文本
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const REVIEW_SYSTEM_PROMPT_ADDON = `
请以 JSON 格式返回审核结果，格式如下（不要包含 markdown 代码块标记）：
{
  "summary": "审核摘要，200字以内",
  "riskLevel": "low|medium|high|critical",
  "score": 85,
  "suggestions": ["建议1", "建议2"],
  "riskFlags": [
    {
      "severity": "low|medium|high|critical",
      "clause": "涉及条款/段落",
      "description": "风险说明",
      "suggestion": "改进建议"
    }
  ],
  "highlights": {
    "positive": ["亮点1"],
    "negative": ["问题1"]
  }
}`

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: contractId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 获取合同
  const contractRows = await db.select({
    id: contracts.id, name: contracts.name, content: contracts.content,
    totalAmount: contracts.totalAmount, status: contracts.status,
    customerId: contracts.customerId,
  }).from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt))).limit(1)

  if (contractRows.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const contract = contractRows[0]
  const contractText = stripHtml(contract!.content || '')

  if (!contractText || contractText.length < 20) {
    throw createError({ statusCode: 400, statusMessage: '合同正文太短，没法审核' })
  }

  // 获取要使用的 AI 员工
  let aiEmployee
  if (parsed.data.aiEmployeeId) {
    const rows = await db.select().from(aiEmployees)
      .where(and(eq(aiEmployees.id, parsed.data.aiEmployeeId), eq(aiEmployees.isActive, true)))
      .limit(1)
    if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'AI 员工不存在或已停用' })
    aiEmployee = rows[0]
    if (aiEmployee!.role !== 'contract_reviewer' && aiEmployee.role !== 'custom') {
      throw createError({ statusCode: 400, statusMessage: '这个 AI 员工不是合同审核角色' })
    }
  } else {
    // 找第一个活跃的合同审核员
    const rows = await db.select().from(aiEmployees)
      .where(and(eq(aiEmployees.role, 'contract_reviewer'), eq(aiEmployees.isActive, true)))
      .limit(1)
    if (rows.length === 0) {
      // fallback 到 custom 角色
      const customRows = await db.select().from(aiEmployees)
        .where(and(eq(aiEmployees.isActive, true)))
        .limit(1)
      if (customRows.length === 0) {
        throw createError({ statusCode: 400, statusMessage: '没有可用的合同审核 AI 员工，请先去设置里创建一个' })
      }
      aiEmployee = customRows[0]
    } else {
      aiEmployee = rows[0]
    }
  }

  // 获取供应商
  const providerRows = await db.select().from(aiProviders)
    .where(and(eq(aiProviders.id, aiEmployee!.providerId), eq(aiProviders.isEnabled, true)))
    .limit(1)
  if (providerRows.length === 0) throw createError({ statusCode: 400, statusMessage: 'AI 供应商不存在或已停用' })

  const provider = providerRows[0]

  // 创建审核记录（初始状态）
  const reviewId = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const triggeredBy = parsed.data.aiEmployeeId ? user.userId : 'auto'

  await db.insert(aiReviews).values({
    id: reviewId,
    contractId,
    aiEmployeeId: aiEmployee!.id,
    status: 'processing',
    modelUsed: aiEmployee!.model,
    triggeredBy,
    createdAt: now,
    updatedAt: now,
  })

  // 调用 AI
  const startTime = Date.now()
  const config = useRuntimeConfig()
  const apiKey = decryptApiKey(provider!.apiKey, config.aiEncryptionKey || config.jwtSecret)
  const aiProvider = createProvider({ type: provider!.type, baseUrl: provider.baseUrl, apiKey })

  try {
    const userMessage = `请审核以下合同：

合同名称：${contract!.name}
合同金额：¥${(contract!.totalAmount || 0).toLocaleString()}

合同正文：
${contractText.slice(0, 12000)}

请仔细审核并给出专业意见。`

    const response = await aiProvider.chat({
      messages: [
        { role: 'system', content: aiEmployee!.systemPrompt + '\n\n' + REVIEW_SYSTEM_PROMPT_ADDON },
        { role: 'user', content: userMessage },
      ],
      model: aiEmployee!.model,
      temperature: aiEmployee!.temperature,
      maxTokens: aiEmployee!.maxTokens,
    })

    const duration = Date.now() - startTime

    // 解析 AI 响应 — 尝试提取 JSON
    let result: AIReviewResult | null = null
    let rawResponse = response.content

    try {
      // 尝试直接解析
      result = JSON.parse(response.content.trim())
    } catch {
      // 尝试从 markdown 代码块中提取
      const jsonMatch = response.content.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[1].trim())
        } catch {
          // 解析失败，使用原始文本
        }
      }
    }

    if (!result) {
      // 无法解析 JSON，保存原始响应作为摘要
      result = {
        summary: response.content.slice(0, 300),
        riskLevel: 'medium',
        score: 50,
        suggestions: ['AI 返回了非结构化内容，请查看原始响应'],
        riskFlags: [],
        highlights: { positive: [], negative: ['AI 返回格式异常，请检查系统提示词'] },
      }
    }

    // 更新审核记录
    await db.update(aiReviews).set({
      status: 'completed',
      result: JSON.stringify(result),
      rawResponse,
      promptTokens: response.usage?.promptTokens || null,
      completionTokens: response.usage?.completionTokens || null,
      duration,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }).where(eq(aiReviews.id, reviewId))

    await logOperation(event, { action: 'CREATE', module: 'ai_review', targetId: reviewId, detail: `AI 审核了合同「${contract!.name}」` })

    return {
      code: 0,
      data: {
        id: reviewId,
        status: 'completed',
        result,
        modelUsed: aiEmployee!.model,
        duration,
        usage: response.usage,
      },
      message: 'AI 审核搞定了！',
    }
  } catch (e: any) {
    const duration = Date.now() - startTime
    await db.update(aiReviews).set({
      status: 'failed',
      errorMessage: e.message || '未知错误',
      duration,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }).where(eq(aiReviews.id, reviewId))

    throw createError({ statusCode: 500, statusMessage: `AI 审核失败：${e.message || '未知错误'}` })
  }
})
