import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { projectMembers } from '#schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ role: z.enum(['leader', 'member']) })

export default defineEventHandler(async (event) => {
  const { id, userId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '角色不对' })
  await db.update(projectMembers)
    .set({ role: parsed.data.role })
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
  await logOperation(event, { action: 'UPDATE', module: 'project', targetId: id, detail: '更新了项目成员角色' })
  return { code: 0, data: null, message: '角色已更新' }
})
