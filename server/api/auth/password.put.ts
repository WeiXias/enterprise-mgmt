import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword, verifyAccessToken } from '#server-utils/auth'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const payload = await verifyAccessToken(token)
  if (!payload?.userId) throw createError({ statusCode: 401, statusMessage: '登录已过期' })

  const body = await readBody(event)
  const { oldPassword, newPassword } = body || {}

  if (!oldPassword || !newPassword) {
    throw createError({ statusCode: 422, statusMessage: '旧密码和新密码都要填哦' })
  }

  const dbUser = await db.select({ password: users.password }).from(users).where(eq(users.id, payload.userId)).limit(1)
  if (!dbUser.length) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  const valid = await verifyPassword(oldPassword, dbUser[0].password)
  if (!valid) throw createError({ statusCode: 403, statusMessage: '旧密码不对' })

  const hashed = await hashPassword(newPassword)
  await db.update(users).set({ password: hashed }).where(eq(users.id, payload.userId))

  await logOperation(event, { action: 'UPDATE', module: 'user', targetId: payload.userId, detail: '修改了密码' })
  return { code: 0, data: null, message: '密码改好了！' }
})
