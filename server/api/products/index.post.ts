import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { products } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '产品名称不能为空').max(200),
  code: z.string().max(50).optional(),
  categoryId: z.string().optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  standardPrice: z.number().min(0).optional().default(0),
  costPrice: z.number().min(0).optional().default(0),
  description: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 自动生成编码：P + 年月日 + 4位随机
  const now = new Date()
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const code = parsed.data.code || `P${datePart}${rand}`

  // 检查编码唯一性
  const existing = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.code, code), isNull(products.deletedAt))).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '产品编码已存在' })

  const nowStr = now.toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(products).values({
    id: generateId(),
    name: parsed.data.name,
    code,
    categoryId: parsed.data.categoryId || null,
    model: parsed.data.model || null,
    manufacturer: parsed.data.manufacturer || null,
    unit: parsed.data.unit || null,
    standardPrice: parsed.data.standardPrice,
    costPrice: parsed.data.costPrice,
    description: parsed.data.description || null,
    status: 'on_sale',
    createdAt: nowStr,
    updatedAt: nowStr,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'product', targetId: result[0].id, detail: `创建了产品「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '产品已添加' }
})
