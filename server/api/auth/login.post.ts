import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '#server-utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: '用户名和密码还没填呢' })
  }

  const result = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
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

  const accessToken = await generateAccessToken({ userId: user!.id, role: user.role, name: user.name, tokenVersion: user!.tokenVersion })
  const refreshToken = await generateRefreshToken({ userId: user!.id, tokenVersion: user!.tokenVersion })

  return {
    code: 0,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user!.id,
        name: user!.name,
        username: user!.username,
        role: user!.role,
        avatar: user!.avatar,
      }
    },
    message: '登录成功！'
  }
})
