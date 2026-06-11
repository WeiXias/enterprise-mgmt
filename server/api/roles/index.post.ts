import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { roles } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({ name: z.string().min(1).max(50), code: z.string().min(1).max(30).regex(/^[a-z_]+$/), description: z.string().optional(), sortOrder: z.number().optional() })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, parsed.data.code)).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '角色标识已存在' })

  const id = generateId()
  await db.insert(roles).values({ id, name: parsed.data.name, code: parsed.data.code, description: parsed.data.description || null, sortOrder: parsed.data.sortOrder ?? 0, isSystem: false })

  return { code: 0, data: { id }, message: '角色已创建' }
})
