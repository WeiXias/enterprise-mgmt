import { requirePermission } from '#server-utils/permission'
import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { departments } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1).max(100).optional(), parentId: z.string().optional().nullable(), managerId: z.string().optional().nullable(), description: z.string().optional().nullable(), sortOrder: z.number().optional() })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.parentId !== undefined) updateData.parentId = parsed.data.parentId
  if (parsed.data.managerId !== undefined) updateData.managerId = parsed.data.managerId
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder

  await db.update(departments).set(updateData).where(eq(departments.id, id))
  return { code: 0, data: null, message: '已保存' }
})
