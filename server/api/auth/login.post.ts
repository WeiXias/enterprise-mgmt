import { defineEventHandler, readBody, createError, setCookie } from 'h3'
import { z } from 'zod'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '#server-utils/auth'

const loginSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符'),
  password: z.string().min(8, '密码至少8个字符'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues.map(i => i.message).join('；') })
  }
  const { username, password } = parsed.data

  const result = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
    roleId: users.roleId,
    status: users.status,
    avatar: users.avatar,
    password: users.password,
    tokenVersion: users.tokenVersion,
  }).from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (result.length === 0) {
    throw createError({ statusCode: 401, statusMessage: '用户名或密码不对' })
  }

  const user = result[0]
  if (user!.status === 'disabled') {
    throw createError({ statusCode: 403, statusMessage: '账号已被停用' })
  }

  const valid = await verifyPassword(password, user!.password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: '用户名或密码不对' })
  }

  const accessToken = await generateAccessToken({ userId: user!.id, role: user.role, name: user.name, roleId: user!.roleId, tokenVersion: user!.tokenVersion })
  const refreshToken = await generateRefreshToken({ userId: user!.id, tokenVersion: user!.tokenVersion })

  const userInfo = {
    id: user!.id,
    name: user!.name,
    username: user!.username,
    role: user!.role,
    roleId: user!.roleId,
    avatar: user!.avatar,
    permissions: [] as string[],
  }

  // 查询用户权限列表
  if (user!.roleId) {
    const { rolePermissions: rp, permissions: permTable } = await import('#schema')
    const permRows = await db.select({ code: permTable.code })
      .from(rp)
      .innerJoin(permTable, eq(rp.permissionId, permTable.id))
      .where(eq(rp.roleId, user!.roleId))
    userInfo.permissions = permRows.map((r: any) => r.code)
  } else if (user.role === 'admin') {
    // 硬编码 admin（无 roleId 的后备）：标记为全权限
    userInfo.permissions = ['__all__']
  }

  // 写 cookie 让 SSR 能读取用户状态，避免 hydration mismatch
  const cookieOpts = { maxAge: 60 * 60 * 24 * 7, path: '/', httpOnly: false, sameSite: 'lax' as const }
  setCookie(event, 'auth_user', JSON.stringify(userInfo), cookieOpts)

  return {
    code: 0,
    data: {
      accessToken,
      refreshToken,
      user: userInfo,
    },
    message: '登录成功！'
  }
})
