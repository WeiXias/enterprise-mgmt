import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todoTags } from '#schema/todos'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '标签名不能为空').max(50),
  color: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 检查同名标签是否已存在
  const existing = await db.select({ id: todoTags.id }).from(todoTags)
    .where(eq(todoTags.name, parsed.data.name))
    .limit(1)

  const id = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(todoTags).values({
    id,
    name: parsed.data.name,
    color: parsed.data.color || 'amber',
    userId: user.userId,
    createdAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'todo_tag', targetId: id, detail: `创建了标签「${parsed.data.name}」` })
  return { code: 0, data: { id, name: parsed.data.name, color: parsed.data.color || 'amber' }, message: '标签已创建' }
})