import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(8).max(50),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'sales_manager', 'sales_member', 'finance']),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
})

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:create')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.username)).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '用户名已存在' })

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const newUserId = generateId()
  await db.insert(users).values({
    id: newUserId,
    username: parsed.data.username,
    password: passwordHash,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    role: parsed.data.role,
    roleId: parsed.data.roleId || null,
    departmentId: parsed.data.departmentId || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'user', targetId: newUserId, detail: `创建了用户「${parsed.data.name}」` })
  return { code: 0, data: null, message: '搞定了！账号已创建' }
})
