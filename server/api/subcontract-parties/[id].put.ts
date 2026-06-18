import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  remark: z.string().max(1000).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'admin')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: subcontractParties.id }).from(subcontractParties).where(eq(subcontractParties.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包方不存在' })

  const update = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))

  await db.update(subcontractParties).set(update).where(eq(subcontractParties.id, id))
  await logOperation(event, { action: 'UPDATE', targetId: id, detail: '更新了分包方' })

  return { code: 0, data: null, message: '已保存' }
})
