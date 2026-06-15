import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { departments, users } from '#schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'department:manage')

  const { id } = getRouterParams(event)

  // 检查子部门
  const childRows = db.select({ cnt: count() }).from(departments).where(and(eq(departments.parentId, id), isNull(departments.deletedAt))).all()
  if (Number(childRows[0]?.cnt || 0) > 0) throw createError({ statusCode: 409, statusMessage: '还有子部门，先删掉子部门再说' })

  // 检查成员
  const memberRows = db.select({ cnt: count() }).from(users).where(and(eq(users.departmentId, id), isNull(users.deletedAt))).all()
  if (Number(memberRows[0]?.cnt || 0) > 0) throw createError({ statusCode: 409, statusMessage: '部门里还有人，先移走再说' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(departments).set({ deletedAt: now }).where(eq(departments.id, id))
  await logOperation(event, { action: 'DELETE', module: 'department', targetId: id, detail: '删除了部门' })
  return { code: 0, data: null, message: '部门已删除' }
})
