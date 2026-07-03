import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, contractContentVersions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { generateId } from '#server-utils/id'
import { requirePermission, checkPermission } from '#server-utils/permission'

const schema = z.object({ content: z.any() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:edit')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '内容格式不对' })

  const existing = await db.select({ id: contracts.id, status: contracts.status, createdBy: contracts.createdBy, version: contracts.version })
    .from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = existing[0]
  // 仅草稿状态可编辑，或管理员可编辑任意状态
  if (c!.status !== 'draft' && !(await checkPermission(event, 'contract:manage')))
    throw createError({ statusCode: 400, statusMessage: '只有草稿状态的合同才能修改正文' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const newVersion = (c!.version || 0) + 1

  await db.transaction(async (tx) => {
    await tx.insert(contractContentVersions).values({
      id: generateId(),
      contractId: id,
      content: JSON.stringify(parsed.data.content),
      version: newVersion,
      createdBy: user.userId,
      createdAt: now,
    })
    await tx.update(contracts).set({ content: JSON.stringify(parsed.data.content), version: newVersion, updatedAt: now })
      .where(eq(contracts.id, id))
  })

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: id, detail: '更新了合同正文' })

  return { code: 0, data: null, message: '正文已保存' }
})
