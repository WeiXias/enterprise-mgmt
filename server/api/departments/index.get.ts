import { defineEventHandler } from 'h3'
import { db } from '#database'
import { departments, users } from '#schema'
import { isNull, asc, eq, count, getTableColumns } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const all = await db.select({
    id: departments.id, name: departments.name, parentId: departments.parentId,
    managerId: departments.managerId, managerName: users.name,
    description: departments.description, sortOrder: departments.sortOrder,
    createdAt: departments.createdAt,
  }).from(departments)
    .leftJoin(users, eq(departments.managerId, users.id))
    .orderBy(asc(departments.sortOrder), asc(departments.createdAt))

  // 统计成员数
  const memberCounts: Record<string, number> = {}
  const rawCounts = db.select({ departmentId: users.departmentId, cnt: count() })
    .from(users).groupBy(users.departmentId).all()
  rawCounts.forEach((r: { departmentId: string; cnt: string }) => { if (r.departmentId) memberCounts[r.departmentId] = Number(r.cnt) })

  // 构建树
  const map: Record<string, any> = {}
  const roots: { id: string; name: string; managerId: string; parentId: string | null; children: typeof roots }[] = []
  all.forEach((d: any) => {
    map[d.id] = { ...d, memberCount: memberCounts[d.id] || 0, children: [] }
  })
  all.forEach((d: any) => {
    if (d.parentId && map[d.parentId]) {
      map[d.parentId].children.push(map[d.id])
    } else {
      roots.push(map[d.id])
    }
  })

  return { code: 0, data: roots }
})
