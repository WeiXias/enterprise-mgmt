import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'contract:read')
  const list = await db.select().from(contractAttachments).where(eq(contractAttachments.contractId, id))
  return { code: 0, data: list }
})
