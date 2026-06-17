import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { roles, rolePermissions, users } from '#schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ isSystem: roles.isSystem, deletedAt: roles.deletedAt }).from(roles).where(and(eq(roles.id, id), isNull(roles.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '角色不存在' })
  if (existing[0].isSystem) throw createError({ statusCode: 403, statusMessage: '内置角色不能删除' })

  const memberCount = await db.select({ count: count() }).from(users).where(and(eq(users.roleId, id), isNull(users.deletedAt)))
  if (Number(memberCount[0]?.count || 0) > 0) throw createError({ statusCode: 409, statusMessage: '还有成员在使用这个角色，先给他们换个角色' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
  await db.update(roles).set({ deletedAt: now }).where(eq(roles.id, id))
  await logOperation(event, { action: 'DELETE', module: 'role', targetId: id, detail: '删除了角色' })
  return { code: 0, data: null, message: '角色已删除' }
})
