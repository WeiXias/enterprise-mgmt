import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { followUps } from '#schema/customers'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  type: z.enum(['phone', 'visit', 'wechat', 'email', 'other']),
  content: z.string().min(1, '跟进内容不能为空'),
  nextFollowUpAt: z.string().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'follow-up:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const result = await db.insert(followUps).values({
    id: generateId(),
    customerId,
    opportunityId: null,
    userId: user.userId,
    type: parsed.data.type,
    content: parsed.data.content,
    nextFollowUpAt: parsed.data.nextFollowUpAt || null,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'followup', targetId: result[0].id, detail: '添加了跟进记录' })

  return { code: 0, data: result[0], message: '跟进记录已添加' }
})
