import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  sort: z.string().optional().default('0'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { name, sort } = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 检查重复
  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.dict_type, 'product_category')).where(eq(dictEntries.label, name)).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })

  await db.insert(dictEntries).values({
    id: generateId(),
    dict_type: 'product_category',
    value: name,
    label: name,
    sort,
    is_active: '1',
    createdAt: now,
    updatedAt: now,
  })

  return { code: 0, message: '分类已创建' }
})
