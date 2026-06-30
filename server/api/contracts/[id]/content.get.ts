import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const result = await db.select({ content: contracts.content })
    .from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
    .limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const raw = result[0].content
  if (!raw) return { code: 0, data: { content: null } }

  // 尝试反序列化 ProseMirror JSON；旧数据（纯 HTML 文本）返回原始 HTML 让前端自行渲染
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return { code: 0, data: { content: parsed } }
    }
    // JSON 对象但不是 ProseMirror doc，返回原值
    return { code: 0, data: { content: raw } }
  } catch {
    // 不是 JSON，按 HTML 原文返回
    return { code: 0, data: { content: raw } }
  }
})
