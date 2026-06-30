import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { customerTags, tags } from '#schema/customers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ tagIds: z.array(z.string()) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'tagIds 格式不对' })

  // 先清掉旧的，再重新打
  await db.delete(customerTags).where(eq(customerTags.customerId, customerId))
  if (parsed.data.tagIds.length > 0) {
    await db.insert(customerTags).values(
      parsed.data.tagIds.map(tagId => ({ customerId, tagId }))
    )
  }
  await logOperation(event, { action: 'CREATE', module: 'tag', targetId: customerId, detail: '为客户添加了标签' })
  // 返回最新标签
  const tagList = await db.select({ id: tags.id, name: tags.name, color: tags.color }).from(customerTags)
    .leftJoin(tags, eq(customerTags.tagId, tags.id)).where(eq(customerTags.customerId, customerId))
  return { code: 0, data: tagList, message: '标签已更新' }
})
