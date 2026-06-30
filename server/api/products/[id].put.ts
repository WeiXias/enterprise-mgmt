import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { products } from '#schema'
import { eq, and, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  categoryId: z.string().optional().nullable(),
  standardPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['on_sale', 'off_shelf']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '产品不存在' })

  // 检查编码唯一性
  if (parsed.data.code) {
    const codeExists = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.code, parsed.data.code), ne(products.id, id), isNull(products.deletedAt))).limit(1)
    if (codeExists.length > 0) throw createError({ statusCode: 409, statusMessage: '产品编码已被其他产品使用' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.update(products)
    .set({ ...parsed.data, updatedAt: now })
    .where(eq(products.id, id)).returning()

  await logOperation(event, { action: 'UPDATE', module: 'product', targetId: id, detail: `更新了产品「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '已保存' }
})
