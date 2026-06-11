import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }
  for (const key of ['name', 'phone', 'email', 'avatar'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  await db.update(users).set(updateData).where(eq(users.id, user.userId))

  const updated = await db.select().from(users).where(eq(users.id, user.userId)).limit(1)
  const u = updated[0]
  if (!u) {
    throw createError({ statusCode: 500, statusMessage: '更新后读取用户信息失败' })
  }
  return {
    code: 0,
    data: {
      id: u.id,
      username: u.username,
      name: u.name,
      phone: u.phone,
      email: u.email,
      avatar: u.avatar,
    },
    message: '已保存，随时可以改'
  }
})
