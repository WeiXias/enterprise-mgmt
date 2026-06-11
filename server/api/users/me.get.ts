import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema/users'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }

  const result = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    phone: users.phone,
    email: users.email,
    role: users.role,
    status: users.status,
    avatar: users.avatar,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, user.userId)).limit(1)

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: '账号不存在' })
  }

  const u = result[0]
  return {
    code: 0,
    data: {
      ...u,
      isActive: u.status === 'active',
    }
  }
})
