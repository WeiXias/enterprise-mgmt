import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1),
  content: z.string().optional(),
  placeholders: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const id = generateId()

  await db.insert(contractTemplates).values({
    id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: parsed.data.category,
    content: parsed.data.content || null,
    placeholders: parsed.data.placeholders || null,
    sortOrder: parsed.data.sortOrder,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'contract_template', targetId: id, detail: `创建了合同模板「${parsed.data.name}」` })

  return { code: 0, data: { id }, message: '搞定了！模板已创建' }
})
