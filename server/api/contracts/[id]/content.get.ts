import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const result = await db.select({ content: contracts.content })
    .from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
    .limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const raw = result[0].content
  if (!raw) return { code: 0, data: { content: null } }

  // 尝试反序列化 ProseMirror JSON；旧数据（纯 HTML 文本）返回 null 让前端走 fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return { code: 0, data: { content: parsed } }
    }
    return { code: 0, data: { content: null } }
  } catch {
    return { code: 0, data: { content: null } }
  }
})
