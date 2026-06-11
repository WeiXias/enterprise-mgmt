import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await db.delete(commissionRules).where(eq(commissionRules.id, id))
  await logOperation(event, { action: 'DELETE', module: 'commission', targetId: id, detail: '删除了提成规则' })
  return { code: 0, data: null, message: '规则已删除' }
})
