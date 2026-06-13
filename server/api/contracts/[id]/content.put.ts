import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission, checkPermission } from '#server-utils/permission'

const schema = z.object({ content: z.string() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:edit')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '内容格式不对' })

  const existing = await db.select({ id: contracts.id, status: contracts.status, createdBy: contracts.createdBy })
    .from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = existing[0]
  // 仅草稿状态可编辑，或管理员可编辑任意状态
  if (c!.status !== 'draft' && !(await checkPermission(event, 'contract:manage')))
    throw createError({ statusCode: 400, statusMessage: '只有草稿状态的合同才能修改正文' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contracts).set({ content: parsed.data.content, updatedAt: now })
    .where(eq(contracts.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: id, detail: '更新了合同正文' })

  return { code: 0, data: null, message: '正文已保存' }
})
