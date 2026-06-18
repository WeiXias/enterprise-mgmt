import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, '名称还没填呢'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin')
  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { name, contactPerson, phone, email, address, remark } = parsed.data

  const partyId = generateId()
  await db.insert(subcontractParties).values({
    id: partyId,
    name,
    contactPerson: contactPerson || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
    remark: remark || null,
  })

  await logOperation(event, { action: 'CREATE', targetId: partyId, detail: `添加了分包方「${name}」` })

  return { code: 0, data: null, message: '搞定了！分包方已添加' }
})
