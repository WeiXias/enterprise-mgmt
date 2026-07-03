import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { accounts } from '#schema'
import { eq, asc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const categoryType = query.categoryType as string | undefined
  const isEnabled = query.isEnabled as string | undefined

  const conditions = []
  if (categoryType) conditions.push(eq(accounts.categoryType, categoryType as any))

  const rows = conditions.length > 0
    ? await db.select().from(accounts).where(conditions[0]).orderBy(asc(accounts.code))
    : await db.select().from(accounts).orderBy(asc(accounts.code))

  // 过滤已启用的
  let filtered = rows
  if (isEnabled === '1') filtered = rows.filter(r => r.isEnabled === 1)

  // 构建树形结构
  const tree: any[] = []
  const map = new Map<string, any>()
  for (const r of filtered) {
    map.set(r.id, { ...r, children: [] })
  }
  for (const r of filtered) {
    const node = map.get(r.id)!
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(node)
    } else {
      tree.push(node)
    }
  }

  return { code: 0, data: { tree, flat: filtered } }
})
