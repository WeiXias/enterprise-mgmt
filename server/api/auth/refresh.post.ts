import { db } from '#database'
import { users } from '#schema/users'
import { eq } from 'drizzle-orm'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { refreshToken } = body

  if (!refreshToken) {
    return { code: 1, message: '刷新凭证不能为空' }
  }

  const payload = await verifyRefreshToken(refreshToken)
  if (!payload || payload.type !== 'refresh') {
    return { code: 1, message: '凭证已过期，重新登录一下吧' }
  }

  const rows = await db.select({ id: users.id, status: users.status, role: users.role, tokenVersion: users.tokenVersion })
    .from(users).where(eq(users.id, payload.userId)).limit(1)
  const user = rows[0]

  if (!user || user.status === 'disabled') {
    return { code: 1, message: '账号已被禁用' }
  }

  // 校验 refresh token 中的 version 与数据库一致
  if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
    return { code: 1, message: '凭证已过期，重新登录一下吧' }
  }

  const newAccessToken = await generateAccessToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion })
  const newRefreshToken = await generateRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion })

  return {
    code: 0,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  }
})
