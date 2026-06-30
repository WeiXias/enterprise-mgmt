import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { warehouseLocations } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ name: z.string().min(1).max(50).optional(), code: z.string().max(50).optional(), remark: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'warehouse:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { locId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.code !== undefined) updateData.code = parsed.data.code
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark

  await db.update(warehouseLocations).set(updateData).where(eq(warehouseLocations.id, locId))
  return { code: 0, data: null, message: '库位已保存' }
})
