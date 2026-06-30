import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, payments } from '#schema'
import { and, isNull, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const stats = await db.select({
    totalContractAmount: sql`coalesce(sum(${contracts.totalAmount}), 0)`,
    totalPaid: sql`coalesce((select sum(amount) from payments), 0)`,
    contractCount: sql`count(${contracts.id})`,
  }).from(contracts).where(isNull(contracts.deletedAt))
  const s = stats[0]
  const totalContractAmount = Number(s?.totalContractAmount || 0)
  const totalPaid = Number(s?.totalPaid || 0)
  return {
    code: 0,
    data: {
      totalContractAmount,
      totalReceivedAmount: totalPaid,
      totalUnreceivedAmount: totalContractAmount - totalPaid,
      overdueAmount: 0,
      byMonth: [],
    }
  }
})
