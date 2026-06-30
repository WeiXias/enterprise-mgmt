import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractContentVersions } from '#schema'
import { eq, and } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id, version } = getRouterParams(event)
  const result = await db.select({ content: contractContentVersions.content })
    .from(contractContentVersions)
    .where(and(
      eq(contractContentVersions.contractId, id),
      eq(contractContentVersions.version, Number(version)),
    ))
    .limit(1)

  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '该版本不存在' })

  const raw = result[0].content
  if (!raw) return { code: 0, data: { content: null } }

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
