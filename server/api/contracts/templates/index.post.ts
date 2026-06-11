import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['sales', 'procurement', 'service', 'other']),
  content: z.string().optional(),
  placeholders: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const id = generateId()

  await db.insert(contractTemplates).values({
    id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: parsed.data.category,
    content: parsed.data.content || '',
    placeholders: parsed.data.placeholders || '[]',
    sortOrder: parsed.data.sortOrder,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'contract_template', targetId: id, detail: `创建了合同模板「${parsed.data.name}」` })

  return { code: 0, data: { id }, message: '模板创建成功' }
})
