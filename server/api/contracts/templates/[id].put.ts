import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.string().optional(),
  placeholders: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const existing = await db.select({ id: contractTemplates.id }).from(contractTemplates)
    .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['name', 'description', 'category', 'content', 'placeholders', 'sortOrder']) {
    const val = parsed.data[key as keyof typeof parsed.data]
    if (val !== undefined) updateData[key] = val
  }

  await db.update(contractTemplates).set(updateData).where(eq(contractTemplates.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'contract_template', targetId: id, detail: '更新了合同模板' })

  return { code: 0, data: null, message: '模板已更新' }
})
