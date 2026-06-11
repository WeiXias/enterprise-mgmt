import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { roles, rolePermissions, users } from '#schema'
import { eq, count } from 'drizzle-orm'

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '角色不存在' })
  if (existing[0].isSystem) throw createError({ statusCode: 403, statusMessage: '内置角色不能删除' })

  const memberCount = await db.select({ count: count() }).from(users).where(eq(users.roleId, id))
  if (Number(memberCount[0]?.count || 0) > 0) throw createError({ statusCode: 409, statusMessage: '还有成员在使用这个角色，先给他们换个角色' })

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
  await db.delete(roles).where(eq(roles.id, id))
  return { code: 0, data: null, message: '角色已删除' }
})
