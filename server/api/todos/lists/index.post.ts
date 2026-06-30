import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todoLists } from '#schema/todos'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '清单名称不能为空').max(100),
  color: z.enum(['amber', 'teal', 'blue', 'coral', 'stone', 'violet']).optional(),
  icon: z.string().optional(),
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

  await db.insert(todoLists).values({
    id,
    name: parsed.data.name,
    color: parsed.data.color || 'amber',
    icon: parsed.data.icon || null,
    userId: user.userId,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'todo_list', targetId: id, detail: `创建了清单「${parsed.data.name}」` })
  return { code: 0, data: { id }, message: '清单已创建' }
})