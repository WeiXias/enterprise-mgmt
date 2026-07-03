import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '#server-utils/auth'
import { generateId } from '#server-utils/id'

const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符'),
  password: z.string().min(8, '密码至少8个字符'),
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不对').optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues.map(i => i.message).join('；') })
  }
  const { username, password, name, phone, email } = parsed.data

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
