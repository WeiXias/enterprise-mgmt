import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { warehouses } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(50).optional(),
  address: z.string().optional(),
  manager: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'warehouse:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.code !== undefined) updateData.code = parsed.data.code
  if (parsed.data.address !== undefined) updateData.address = parsed.data.address
  if (parsed.data.manager !== undefined) updateData.manager = parsed.data.manager
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark

  await db.update(warehouses).set(updateData).where(eq(warehouses.id, id))
  return { code: 0, data: null, message: '已保存' }
})
