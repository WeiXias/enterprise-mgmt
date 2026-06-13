import { defineEventHandler } from 'h3'
import { db } from '#database'
import { roles, users } from '#schema'
import { asc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const list = await db.select().from(roles).orderBy(asc(roles.sortOrder), asc(roles.createdAt))

  // 统计每个角色的成员数
  const memberCounts: Record<string, number> = {}
  const counts = db.select({ roleId: users.roleId, cnt: count() }).from(users).groupBy(users.roleId).all()
  counts.forEach((r: { roleId: string; cnt: string }) => { if (r.roleId) memberCounts[r.roleId] = Number(r.cnt) })

  return { code: 0, data: list.map((r: any) => ({ ...r, memberCount: memberCounts[r.id] || 0 })) }
})
