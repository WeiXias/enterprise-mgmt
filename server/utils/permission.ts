import { eq } from 'drizzle-orm'
import { H3Event } from 'h3'
import { verifyAccessToken } from './auth'

export interface AuthUser {
  userId: string
  role: string
  roleId?: string
}

export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = await verifyAccessToken(token)
  if (!payload || payload.type !== 'access') return null

  return { userId: payload.userId, role: payload.role, roleId: payload.roleId }
}

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '还没登录呢，先登一下' })
  }
  return user
}

export async function requireRole(event: H3Event, roles: string[]): Promise<AuthUser> {
  const user = await requireAuth(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
  }
  return user
}

/** 检查用户是否是系统 admin（通过 roleId 查 roles 表，或回退到 role 字段） */
async function isSystemAdmin(userId: string, role?: string): Promise<boolean> {
  try {
    const { db } = await import('#database')
    const { users, roles } = await import('#schema')
    const userRows = await db.select({ roleId: users.roleId, role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    if (!userRows[0]) return false
    // 有 roleId 则查 roles 表验证
    if (userRows[0].roleId) {
      const roleRows = await db.select({ code: roles.code, isSystem: roles.isSystem })
        .from(roles).where(eq(roles.id, userRows[0].roleId)).limit(1)
      return roleRows[0]?.code === 'admin' && roleRows[0]?.isSystem === true
    }
    // 无 roleId 时回退：role === 'admin' 即视为系统管理员
    return userRows[0].role === 'admin'
  } catch {
    return false
  }
}

export async function requirePermission(event: H3Event, permissionCode: string): Promise<AuthUser> {
  const user = await requireAuth(event)
  // 系统管理员拥有所有权限
  if (await isSystemAdmin(user.userId)) return user

  // 从数据库查用户角色拥有的权限
  try {
    const { db } = await import('#database')
    const { users, rolePermissions, permissions } = await import('#schema')
    const userRows = await db.select({ roleId: users.roleId }).from(users).where(eq(users.id, user.userId)).limit(1)
    if (!userRows[0]?.roleId) {
      throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
    }
    const result = await db.select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, userRows[0].roleId))

    const codes = result.map((r: any) => r.code)
    if (!codes.includes(permissionCode)) {
      throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
    }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
  }

  return user
}

/**
 * 检查是否拥有某项权限，返回 true/false，不抛异常。
 * 用于需要根据权限改变行为（如过滤数据）而非直接拒绝的场景。
 */
export async function checkPermission(event: H3Event, permissionCode: string): Promise<boolean> {
  const user = await getAuthUser(event)
  if (!user) return false
  if (await isSystemAdmin(user.userId)) return true

  try {
    const { db } = await import('#database')
    const { users, rolePermissions, permissions } = await import('#schema')
    const userRows = await db.select({ roleId: users.roleId }).from(users).where(eq(users.id, user.userId)).limit(1)
    if (!userRows[0]?.roleId) return false
    const result = await db.select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, userRows[0].roleId))
    return result.some((r: any) => r.code === permissionCode)
  } catch {
    return false
  }
}
