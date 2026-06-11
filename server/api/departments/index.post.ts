import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { departments } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({ name: z.string().min(1).max(100), parentId: z.string().optional(), managerId: z.string().optional(), description: z.string().optional(), sortOrder: z.number().optional() })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  await db.insert(departments).values({ id, name: parsed.data.name, parentId: parsed.data.parentId || null, managerId: parsed.data.managerId || null, description: parsed.data.description || null, sortOrder: parsed.data.sortOrder ?? 0 })

  return { code: 0, data: { id }, message: '部门已创建' }
})
