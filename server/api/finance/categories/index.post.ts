import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { financeCategories } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  sort: z.number().int().optional().default(0),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const catId = generateId()
  const result = await db.insert(financeCategories).values({
    id: catId,
    name: parsed.data.name,
    type: parsed.data.type,
    sort: parsed.data.sort,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'finance', targetId: catId, detail: `创建了财务分类「${parsed.data.name}」` })
  return { code: 0, data: result[0], message: '分类已添加' }
})
