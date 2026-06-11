import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { roles } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1).max(50).optional(), description: z.string().optional().nullable(), sortOrder: z.number().optional() })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder

  await db.update(roles).set(updateData).where(eq(roles.id, id))
  return { code: 0, data: null, message: '已保存' }
})
