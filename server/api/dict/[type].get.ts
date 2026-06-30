import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, asc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { type } = getRouterParams(event)
  await requirePermission(event, 'dict:read')

  const rows = await db
    .select()
    .from(dictEntries)
    .where(eq(dictEntries.dict_type, type))
    .orderBy(asc(dictEntries.sort), asc(dictEntries.createdAt))

  const items = rows.map(r => ({
    id: r.id,
    value: r.value,
    label: r.label,
    sort: Number(r.sort),
    isActive: r.is_active === '1',
  }))

  return { code: 0, data: items }
})
