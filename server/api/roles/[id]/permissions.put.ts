import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { rolePermissions } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ permissionIds: z.array(z.string()) })

import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '权限数据格式不对' })

  // better-sqlite3 不支持 Promise 形式的 transaction，改为顺序操作
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
  if (parsed.data.permissionIds.length > 0) {
    await db.insert(rolePermissions).values(parsed.data.permissionIds.map(permissionId => ({ roleId: id, permissionId })))
  }

  return { code: 0, data: null, message: '权限已保存' }
})
