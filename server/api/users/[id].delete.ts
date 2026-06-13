import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { users, notifications, operationLogs, customers, opportunities, projects, projectMembers, contracts } from '#schema'
import { eq } from 'drizzle-orm'

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  await requirePermission(event, 'user:delete')

  const { id } = getRouterParams(event)
  if (id === user.userId) throw createError({ statusCode: 400, statusMessage: '不能删除自己的账号' })

  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  if (existing.role === 'admin') throw createError({ statusCode: 400, statusMessage: '管理员不能被删除，望理解' })

  const adminId = user.userId

  // 清理操作记录和通知
  await db.delete(notifications).where(eq(notifications.userId, id))
  await db.delete(operationLogs).where(eq(operationLogs.userId, id))

  // 解绑项目成员
  await db.delete(projectMembers).where(eq(projectMembers.userId, id))

  // 客户、商机、项目、合同负责人转给当前管理员
  await db.update(customers).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(customers.ownerUserId, id))
  await db.update(opportunities).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(opportunities.ownerUserId, id))
  await db.update(projects).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(projects.ownerUserId, id))
  await db.update(contracts).set({ createdBy: adminId } as { createdBy: string }).where(eq(contracts.createdBy, id))

  await db.delete(users).where(eq(users.id, id))

  return { code: 0, message: '账号已删除，关联数据已转交管理员' }
})
