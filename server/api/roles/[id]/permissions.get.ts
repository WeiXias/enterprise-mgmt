import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { rolePermissions, permissions } from '#schema'
import { eq } from 'drizzle-orm'

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const { id } = getRouterParams(event)
  const result = await db.select({ permissionId: rolePermissions.permissionId }).from(rolePermissions).where(eq(rolePermissions.roleId, id))

  return { code: 0, data: result.map(r => r.permissionId) }
})
