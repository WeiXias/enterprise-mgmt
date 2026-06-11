import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '#server-utils/auth'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password, name, phone, email } = body || {}

  if (!username || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: '用户名、密码和姓名不能为空' })
  }
  if (username.length < 2) throw createError({ statusCode: 400, statusMessage: '用户名至少2个字符' })
  if (password.length < 8) throw createError({ statusCode: 400, statusMessage: '密码至少8个字符' })

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
  if (existing) throw createError({ statusCode: 409, statusMessage: '用户名已被占用' })

  const hashed = await hashPassword(password)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(users).values({
    id: generateId(),
    username,
    password: hashed,
    name: name || username,
    phone: phone || null,
    email: email || null,
    role: 'sales_member',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }).returning()

  return { code: 0, data: { id: result[0].id, username, name }, message: '注册成功，请等待管理员审批' }
})
