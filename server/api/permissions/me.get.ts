import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { rolePermissions, permissions, users } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const u = event.context.user
  if (!u) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // 管理员拥有所有权限
  if (u.role === 'admin') {
    const all = await db.select({ code: permissions.code }).from(permissions)
    return { code: 0, data: all.map((p: any) => p.code) }
  }

  // 其他用户从角色查权限
  const userRows = await db.select({ roleId: users.roleId }).from(users).where(eq(users.id, u.userId)).limit(1)
  if (!userRows[0]?.roleId) return { code: 0, data: [] }

  const result = await db.select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, userRows[0].roleId))

  return { code: 0, data: result.map((r: any) => r.code) }
})
