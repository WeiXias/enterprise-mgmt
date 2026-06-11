import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { financeCategories } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  await db.delete(financeCategories).where(eq(financeCategories.id, id))
  await logOperation(event, { action: 'DELETE', module: 'finance', targetId: id, detail: '删除了财务分类' })
  return { code: 0, data: null, message: '分类已删除' }
})
