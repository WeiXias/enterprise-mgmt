import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  sort: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product-category:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  const updates: Record<string, string> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }
  if (parsed.data.name !== undefined) {
    // 检查重名
    const nameExists = await db.select({ id: dictEntries.id }).from(dictEntries)
      .where(and(eq(dictEntries.dict_type, 'product_category'), eq(dictEntries.label, parsed.data.name))).limit(1)
    if (nameExists.length > 0 && nameExists[0].id !== id) {
      throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })
    }
    updates.label = parsed.data.name
    updates.value = parsed.data.name
  }
  if (parsed.data.sort !== undefined) updates.sort = parsed.data.sort

  await db.update(dictEntries).set(updates).where(eq(dictEntries.id, id))
  return { code: 0, message: '分类已更新' }
})
