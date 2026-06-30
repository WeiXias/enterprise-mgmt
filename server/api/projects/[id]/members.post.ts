import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { projectMembers } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ userId: z.string(), role: z.enum(['leader', 'member']) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // Check if already a member
  const existing = await db.select({ id: projectMembers.id }).from(projectMembers)
    .where(eq(projectMembers.projectId, projectId))
  const already = existing.find((m: any) => m.id === parsed.data.userId)
  if (already) throw createError({ statusCode: 409, statusMessage: '已经是项目成员了' })

  await db.insert(projectMembers).values({
    id: generateId(),
    projectId,
    userId: parsed.data.userId,
    role: parsed.data.role,
  })
  await logOperation(event, { action: 'CREATE', module: 'project', targetId: projectId, detail: '添加了项目成员' })
  return { code: 0, data: null, message: '成员已添加' }
})
