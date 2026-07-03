import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { accounts, accountBalances } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ isSystem: accounts.isSystem, code: accounts.code }).from(accounts).where(eq(accounts.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '科目不存在' })

  // 系统预置科目不可删除，只能禁用
  if (existing[0].isSystem === 1) throw createError({ statusCode: 403, statusMessage: '系统预置科目不能删除，只能禁用' })

  // 检查是否有余额
  const balances = await db.select({ id: accountBalances.id }).from(accountBalances).where(eq(accountBalances.accountId, id)).limit(1)
  if (balances.length > 0) throw createError({ statusCode: 409, statusMessage: '该科目已有余额记录，不可删除，请禁用' })

  // 检查是否有子科目
  const children = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.parentId, id)).limit(1)
  if (children.length > 0) throw createError({ statusCode: 409, statusMessage: '请先删除下级科目' })

  await db.delete(accounts).where(eq(accounts.id, id))
  await logOperation(event, { action: 'DELETE', module: 'accounting', targetId: id, detail: `删除科目 ${existing[0].code}` })
  return { code: 0, message: '已删除' }
})
