import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, '分包对象名称还没填呢'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { name, contactPerson, phone, email, address, remark } = parsed.data

  const partyId = generateId()
  await db.insert(subcontractParties).values({
    id: partyId,
    name: body.name,
    contactPerson: body.contactPerson || null,
    phone: body.phone || null,
    email: body.email || null,
    address: body.address || null,
    remark: body.remark || null,
  })

  await logOperation(event, { action: 'CREATE', module: 'subcontract', targetId: partyId, detail: `添加了分包方「${body.name}」` })

  return { code: 0, data: null, message: '分包对象已创建' }
})
