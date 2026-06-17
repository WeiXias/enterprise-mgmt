import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { suppliers } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const code = parsed.data.code || `SUP-${id.slice(0, 8).toUpperCase()}`

  await db.insert(suppliers).values({
    id, name: parsed.data.name, code, contactPerson: parsed.data.contactPerson,
    phone: parsed.data.phone, address: parsed.data.address, remark: parsed.data.remark,
    status: 'active',
  })

  return { code: 0, data: { id }, message: '搞定了！供应商已添加' }
})
