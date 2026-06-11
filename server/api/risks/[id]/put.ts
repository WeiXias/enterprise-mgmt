import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { risks } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['risk', 'issue']).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  probability: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['identified', 'mitigating', 'resolved', 'closed']).optional(),
  mitigation: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const [existing] = await db.select().from(risks).where(and(eq(risks.id, id), isNull(risks.deletedAt)))
  if (!existing) throw createError({ statusCode: 404, statusMessage: '风险不存在' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }
  if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
    updateData.resolvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  await db.update(risks).set(updateData).where(eq(risks.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'project', targetId: id, detail: `更新风险: ${parsed.data.title || existing.title}` })
  return { code: 0, data: null, message: '已保存' }
})
