import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { warehouses } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(50).optional(),
  address: z.string().optional().default(''),
  manager: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const code = parsed.data.code || `WH-${id.slice(0, 8).toUpperCase()}`
  await db.insert(warehouses).values({ id, name: parsed.data.name, code, address: parsed.data.address, manager: parsed.data.manager, remark: parsed.data.remark })
  return { code: 0, data: { id }, message: '仓库已添加' }
})
