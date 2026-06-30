import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '商机名称得填一下').max(200),
  customerId: z.string().min(1, '选一下客户'),
  estimatedAmount: z.number().min(0).optional(),
  estimatedCloseDate: z.string().optional().or(z.literal('')),
  source: z.string().optional(),
  competitor: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const oppId = generateId()
  await db.insert(opportunities).values({
    id: oppId,
    name: parsed.data.name,
    customerId: parsed.data.customerId,
    ownerUserId: user.userId,
    estimatedAmount: parsed.data.estimatedAmount ?? 0,
    estimatedCloseDate: parsed.data.estimatedCloseDate || null,
    source: parsed.data.source || null,
    competitor: parsed.data.competitor || null,
    status: 'initial_contact',
  })

  await logOperation(event, { action: 'CREATE', module: 'opportunity', targetId: oppId, detail: `创建了商机「${parsed.data.name}」` })
  return { code: 0, data: { id: oppId }, message: '商机已创建，加油跟进！' }
})
