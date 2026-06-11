import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)

  const existing = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包合同不存在' })

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.status !== undefined) updateData.status = body.status
  if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount
  if (body.subcontractPartyId !== undefined) updateData.subcontractPartyId = body.subcontractPartyId
  if (body.taxRate !== undefined) updateData.taxRate = body.taxRate
  updateData.updatedAt = new Date().toISOString()

  await db.update(contracts).set(updateData).where(eq(contracts.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'subcontract', targetId: id, detail: '更新了分包合同' })

  return { code: 0, data: null, message: '已保存' }
})
