import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { users, departments, roles } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  const result = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    phone: users.phone,
    email: users.email,
    avatar: users.avatar,
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
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1)

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  const user = result[0]
  return { code: 0, data: user }
})
