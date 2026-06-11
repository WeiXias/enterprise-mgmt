import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { departments, users } from '#schema'
import { eq, count } from 'drizzle-orm'

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const { id } = getRouterParams(event)

  // 检查子部门
  const childRows = db.select({ cnt: count() }).from(departments).where(eq(departments.parentId, id)).all()
  if (Number(childRows[0]?.cnt || 0) > 0) throw createError({ statusCode: 409, statusMessage: '还有子部门，先删掉子部门再说' })

  // 检查成员
  const memberRows = db.select({ cnt: count() }).from(users).where(eq(users.departmentId, id)).all()
  if (Number(memberRows[0]?.cnt || 0) > 0) throw createError({ statusCode: 409, statusMessage: '部门里还有人，先移走再说' })

  db.delete(departments).where(eq(departments.id, id)).run()
  return { code: 0, data: null, message: '部门已删除' }
})
