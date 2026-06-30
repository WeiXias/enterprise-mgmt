import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { users, roles, departments } from '#schema'
import { and, like, eq, desc, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'user:read')
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const role = query.role as string | undefined

  const conditions = []
  if (keyword) conditions.push(like(users.name, `%${keyword}%`))
  if (role) conditions.push(eq(users.role, role))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      roleId: users.roleId,
      departmentId: users.departmentId,
      status: users.status,
      createdAt: users.createdAt,
      departmentName: departments.name,
      roleName: roles.name,
    }).from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})
