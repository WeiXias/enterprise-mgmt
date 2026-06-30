import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { permissions } from '#schema'
import { asc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'role:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const list = await db.select().from(permissions).orderBy(asc(permissions.resource), asc(permissions.action))

  // 按 resource 分组
  const groups: Record<string, any[]> = {}
  list.forEach((p: any) => {
    if (!groups[p.resource]) groups[p.resource] = []
    groups[p.resource].push(p)
  })

  return { code: 0, data: groups }
})
