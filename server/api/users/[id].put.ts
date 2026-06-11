import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { users } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'sales_manager', 'sales_member', 'finance']).optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
})

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:edit')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  // 不能修改管理员的角色和状态
  if (existing[0].role === 'admin') {
    if (parsed.data.role && parsed.data.role !== 'admin') throw createError({ statusCode: 400, statusMessage: '不能修改管理员的角色' })
    if (parsed.data.status) throw createError({ statusCode: 400, statusMessage: '管理员不能被停用，望理解' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }
  for (const key of ['name', 'phone', 'email', 'role', 'roleId', 'departmentId', 'status'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  await db.update(users).set(updateData).where(eq(users.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'user', targetId: id, detail: '更新了用户资料' })
  return { code: 0, data: null, message: '已保存，随时可以改' }
})
