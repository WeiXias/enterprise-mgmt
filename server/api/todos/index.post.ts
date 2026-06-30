import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  listId: z.string().min(1, '请选择清单'),
  title: z.string().min(1, '标题不能为空').max(200),
  note: z.string().optional(),
  priority: z.enum(['urgent_important', 'urgent_not_important', 'important_not_urgent', 'not_urgent_not_important']).optional(),
  dueDate: z.string().optional().or(z.literal('')),
  remindAt: z.string().optional().or(z.literal('')),
  customerId: z.string().optional(),
  contractId: z.string().optional(),
  projectId: z.string().optional(),
  opportunityId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(todos).values({
    id,
    listId: parsed.data.listId,
    title: parsed.data.title,
    note: parsed.data.note || null,
    priority: parsed.data.priority || 'not_urgent_not_important',
    status: 'todo',
    dueDate: parsed.data.dueDate || null,
    remindAt: parsed.data.remindAt || null,
    userId: user.userId,
    customerId: parsed.data.customerId || null,
    contractId: parsed.data.contractId || null,
    projectId: parsed.data.projectId || null,
    opportunityId: parsed.data.opportunityId || null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'todo', targetId: id, detail: `创建了待办「${parsed.data.title}」` })
  return { code: 0, data: { id }, message: '搞定了！待办已添加' }
})