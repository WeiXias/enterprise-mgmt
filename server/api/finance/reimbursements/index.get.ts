import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { reimbursements, users, projects } from '#schema'
import { eq, like, and, isNull, count, desc } from 'drizzle-orm'
import { checkPermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reimbursement:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(reimbursements.deletedAt)]
  if (query.status) where.push(eq(reimbursements.status, query.status as string))
  if (query.keyword) where.push(like(reimbursements.reason, `%${query.keyword}%`))
  // Non-admin/finance users only see their own
  const isFinance = await checkPermission(event, 'finance:view')
  if (!isFinance) {
    where.push(eq(reimbursements.userId, user.userId))
  }
  if (query.userId) where.push(eq(reimbursements.userId, query.userId as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: reimbursements.id,
      type: reimbursements.type,
      amount: reimbursements.amount,
      reason: reimbursements.reason,
      status: reimbursements.status,
      userId: reimbursements.userId,
      userName: users.name,
      projectId: reimbursements.projectId,
      projectName: projects.name,
      approvedBy: reimbursements.approvedBy,
      approvedAt: reimbursements.approvedAt,
      rejectedReason: reimbursements.rejectedReason,
      paidAt: reimbursements.paidAt,
      createdAt: reimbursements.createdAt,
    }).from(reimbursements)
      .leftJoin(users, eq(reimbursements.userId, users.id))
      .leftJoin(projects, eq(reimbursements.projectId, projects.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(reimbursements.createdAt)),
    db.select({ count: count() }).from(reimbursements).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((r: any) => ({
        ...r,
        user: { id: r.userId, name: r.userName },
        project: r.projectId ? { id: r.projectId, name: r.projectName } : null,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
