import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { warehouseLocations } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ name: z.string().min(1).max(50), code: z.string().min(1).max(50), remark: z.string().optional().default('') })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'warehouse:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const locId = generateId()
  await db.insert(warehouseLocations).values({ id: locId, warehouseId: id, name: parsed.data.name, code: parsed.data.code, remark: parsed.data.remark })
  return { code: 0, data: { id: locId }, message: '库位已添加' }
})
