import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'commission:manage')
  const { id } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(commissionRules).set({ isActive: 'no', updatedAt: now } as any).where(eq(commissionRules.id, id))
  await logOperation(event, { action: 'DELETE', module: 'commission', targetId: id, detail: '停用了提成规则' })
  return { code: 0, data: null, message: '规则已停用' }
})
