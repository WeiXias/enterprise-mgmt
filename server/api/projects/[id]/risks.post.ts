import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { risks } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['risk', 'issue']).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  probability: z.enum(['low', 'medium', 'high']).optional(),
  mitigation: z.string().optional(),
  assignedTo: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.insert(risks).values({
    id, projectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    type: parsed.data.type || 'risk',
    impact: parsed.data.impact || 'medium',
    probability: parsed.data.probability || 'medium',
    status: 'identified',
    mitigation: parsed.data.mitigation || null,
    assignedTo: parsed.data.assignedTo || null,
    createdAt: now, updatedAt: now,
  })
  await logOperation(event, { action: 'CREATE', module: 'project', targetId: id, detail: `添加${parsed.data.type === 'issue' ? '问题' : '风险'}: ${parsed.data.title}` })

  const [item] = await db.select().from(risks).where(eq(risks.id, id))
  return { code: 0, data: item }
})
