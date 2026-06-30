import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { projects, projectMembers, tasks, deliverables, users, contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const result = await db.select().from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '项目不存在' })

  const p = result[0]

  // 销售成员只能看自己的项目，或是被分配到的项目
  if (user.role === 'sales_member' && p!.ownerUserId !== user.userId) {
    const memberCheck = await db.select({ id: projectMembers.id })
      .from(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, user.userId))).limit(1)
    if (memberCheck.length === 0) {
      throw createError({ statusCode: 403, statusMessage: '这个项目你无权查看' })
    }
  }

  const [ownerResult, contractResult, memberList, taskList, deliverableList] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, p!.ownerUserId)).limit(1),
    p!.contractId
      ? db.select({ id: contracts.id, code: contracts.code, name: contracts.name }).from(contracts).where(eq(contracts.id, p!.contractId)).limit(1)
      : Promise.resolve([]),
    db.select({ userId: projectMembers.userId, role: projectMembers.role, name: users.name })
      .from(projectMembers).leftJoin(users, eq(projectMembers.userId, users.id)).where(eq(projectMembers.projectId, id)),
    db.select().from(tasks).where(eq(tasks.projectId, id)),
    db.select().from(deliverables).where(eq(deliverables.projectId, id)),
  ])

  return {
    code: 0,
    data: {
      id: p!.id,
      name: p!.name,
      contract: contractResult[0] || null,
      owner: ownerResult[0] || null,
      budget: p!.budget,
      remark: p!.remark,
      status: p!.status,
      startDate: p!.startDate,
      endDate: p!.endDate,
      members: memberList,
      tasks: taskList,
      deliverables: deliverableList,
      createdAt: p!.createdAt,
      updatedAt: p!.updatedAt,
    }
  }
})
