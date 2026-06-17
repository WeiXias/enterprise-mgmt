import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { suppliers } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import dayjs from 'dayjs'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  taxId: z.string().optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const data: Record<string, any> = { updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v
  }

  if (Object.keys(data).length > 0) {
    await db.update(suppliers).set(data).where(eq(suppliers.id, id))
  }

  return { code: 0, data: null, message: '已保存' }
})
