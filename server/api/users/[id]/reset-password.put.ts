import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ newPassword: z.string().min(8).max(50) })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '新密码至少8位' })

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(users).set({ password: passwordHash, updatedAt: now }).where(eq(users.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'user', targetId: id, detail: '重置了用户密码' })
  return { code: 0, data: null, message: '密码已重置' }
})
