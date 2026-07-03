import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { users, notifications, operationLogs, customers, opportunities, projects, projectMembers, contracts } from '#schema'
import { eq, isNull, and } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  await requirePermission(event, 'user:delete')

  const { id } = getRouterParams(event)
  if (id === user.userId) throw createError({ statusCode: 400, statusMessage: '不能删除自己的账号' })

  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  if (existing.role === 'admin') throw createError({ statusCode: 400, statusMessage: '管理员不能被删除，望理解' })

  const adminId = user.userId
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  await db.transaction(async (tx) => {
    // 客户、商机、项目、合同负责人转给当前管理员
    await tx.update(customers).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(customers.ownerUserId, id))
    await tx.update(opportunities).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(opportunities.ownerUserId, id))
    await tx.update(projects).set({ ownerUserId: adminId } as { ownerUserId: string }).where(eq(projects.ownerUserId, id))
    await tx.update(contracts).set({ createdBy: adminId } as { createdBy: string }).where(eq(contracts.createdBy, id))

    // 清理操作记录和通知
    await tx.update(notifications).set({ deletedAt: now } as any).where(eq(notifications.userId, id))
    await tx.update(operationLogs).set({ deletedAt: now } as any).where(eq(operationLogs.userId, id))

    // 解绑项目成员
    await tx.update(projectMembers).set({ deletedAt: now } as any).where(eq(projectMembers.userId, id))

    // 软删除用户
    await tx.update(users).set({ deletedAt: now }).where(eq(users.id, id))
  })

  await logOperation(event, { action: 'DELETE', module: 'user', targetId: id, detail: '删除了用户，关联数据已转交' })
  return { code: 0, data: null, message: '账号已删除，关联数据已转交管理员' }
})
