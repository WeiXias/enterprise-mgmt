import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: subcontractParties.id }).from(subcontractParties).where(eq(subcontractParties.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包对象不存在' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(subcontractParties).set({ deletedAt: now } as any).where(eq(subcontractParties.id, id))

  await logOperation(event, { action: 'DELETE', module: 'subcontract', targetId: id, detail: '删除了分包方' })

  return { code: 0, data: null, message: '分包对象已删除' }
})
