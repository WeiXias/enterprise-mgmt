import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ userIds: z.array(z.string()).min(1).max(200), _action: z.enum(['add', 'remove']).optional() })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '请选择成员' })

  await db.update(users).set({ departmentId: parsed.data._action === 'remove' ? null : id, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(inArray(users.id, parsed.data.userIds))

  const msg = parsed.data._action === 'remove' ? `搞定了！${parsed.data.userIds.length} 人已移出部门` : `搞定了！${parsed.data.userIds.length} 人已加入部门`
  return { code: 0, data: null, message: msg }
})
