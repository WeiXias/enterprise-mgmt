import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { productCategories } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  sort: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: productCategories.id }).from(productCategories)
    .where(eq(productCategories.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  // 检查重名
  if (parsed.data.name) {
    const nameExists = await db.select({ id: productCategories.id }).from(productCategories)
      .where(eq(productCategories.name, parsed.data.name)).limit(1)
    if (nameExists.length > 0 && nameExists[0].id !== id) {
      throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })
    }
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const result = await db.update(productCategories)
    .set({ ...parsed.data })
    .where(eq(productCategories.id, id)).returning()

  await logOperation(event, { action: 'UPDATE', module: 'category', targetId: id, detail: `更新了产品分类「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '已保存' }
})
