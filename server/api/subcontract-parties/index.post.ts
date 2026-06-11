import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 422, statusMessage: '分包对象名称还没填呢' })

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
