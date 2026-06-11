import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { productCategories } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50),
  sort: z.string().optional().default('0'),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 检查重名
  const existing = await db.select({ id: productCategories.id }).from(productCategories)
    .where(eq(productCategories.name, parsed.data.name)).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })

  const result = await db.insert(productCategories).values({
    id: generateId(),
    name: parsed.data.name,
    sort: parsed.data.sort,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'category', targetId: result[0].id, detail: `创建了产品分类「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '分类已添加' }
})
