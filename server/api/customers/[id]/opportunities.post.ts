import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().min(0).optional(),
  expectedCloseDate: z.string().optional().or(z.literal('')),
  source: z.string().optional(),
  competitor: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  const now = new Date()
  const oppId = generateId()
  await db.insert(opportunities).values({
    id: oppId, name: parsed.data.name, customerId,
    ownerId: user.userId, amount: parsed.data.amount || null,
    expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null,
    source: parsed.data.source || null, competitor: parsed.data.competitor || null,
    status: 'initial', createdAt: now, updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'opportunity', targetId: oppId, detail: `为客户创建了商机「${parsed.data.name}」` })

  return { code: 0, data: { id: oppId }, message: '商机已创建' }
})
