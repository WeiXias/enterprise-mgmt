import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const { id } = getRouterParams(event)
  const list = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role, avatar: users.avatar, phone: users.phone }).from(users)
    .where(eq(users.departmentId, id))

  return { code: 0, data: list }
})
