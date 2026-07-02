import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { eq, isNull, and } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'contract:view')
  const list = await db.select().from(contractAttachments).where(and(eq(contractAttachments.contractId, id), isNull(contractAttachments.deletedAt) as any))
  return { code: 0, data: list }
})
