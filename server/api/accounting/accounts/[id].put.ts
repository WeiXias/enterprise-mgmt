import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { accounts } from '#schema'
import { eq, and } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  sort: z.number().int().optional(),
  isEnabled: z.number().int().optional(),
  remark: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ isSystem: accounts.isSystem }).from(accounts).where(eq(accounts.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '科目不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updates: Record<string, any> = { updatedAt: now }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.parentId !== undefined) updates.parentId = parsed.data.parentId
  if (parsed.data.sort !== undefined) updates.sort = parsed.data.sort
  if (parsed.data.isEnabled !== undefined) updates.isEnabled = parsed.data.isEnabled
  if (parsed.data.remark !== undefined) updates.remark = parsed.data.remark

  await db.update(accounts).set(updates).where(eq(accounts.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'accounting', targetId: id, detail: '更新科目' })
  return { code: 0, message: '已更新' }
})
