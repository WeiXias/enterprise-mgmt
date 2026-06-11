import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const existing = await db.select({ id: subcontractParties.id }).from(subcontractParties).where(eq(subcontractParties.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包对象不存在' })

  const update: any = {}
  if (body.name !== undefined) update.name = body.name
  if (body.contactPerson !== undefined) update.contactPerson = body.contactPerson
  if (body.phone !== undefined) update.phone = body.phone
  if (body.email !== undefined) update.email = body.email
  if (body.address !== undefined) update.address = body.address
  if (body.remark !== undefined) update.remark = body.remark

  await db.update(subcontractParties).set(update).where(eq(subcontractParties.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'subcontract', targetId: id, detail: '更新了分包方' })

  return { code: 0, data: null, message: '已保存' }
})
