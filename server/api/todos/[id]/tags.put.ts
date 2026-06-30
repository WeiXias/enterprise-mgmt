import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todoTagRelations, todoTags } from '#schema/todos'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'

// 设置任务的标签（全量替换）
const schema = z.object({
  tagIds: z.array(z.string()).default([]),
  // 也支持创建新标签并关联，传入 newTags 数组
  newTags: z.array(z.object({ name: z.string().min(1).max(50), color: z.string().optional() })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 创建新标签
  const newTagIds: string[] = []
  if (parsed.data.newTags && parsed.data.newTags.length > 0) {
    for (const tag of parsed.data.newTags) {
      // 检查同名标签是否已存在
      const existing = await db.select({ id: todoTags.id }).from(todoTags)
        .where(eq(todoTags.name, tag.name))
        .limit(1)
      if (existing.length > 0) {
        newTagIds.push(existing[0].id)
      } else {
        const tagId = generateId()
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
        await db.insert(todoTags).values({
          id: tagId,
          name: tag.name,
          color: tag.color || 'amber',
          userId: user.userId,
          createdAt: now,
        })
        newTagIds.push(tagId)
      }
    }
  }

  // 全量替换：先删后插
  await db.delete(todoTagRelations).where(eq(todoTagRelations.todoId, id))
  const allTagIds = [...parsed.data.tagIds, ...newTagIds]
  if (allTagIds.length > 0) {
    await db.insert(todoTagRelations).values(
      allTagIds.map(tagId => ({ todoId: id, tagId }))
    )
  }

  // 返回完整的标签信息
  const tags = allTagIds.length > 0
    ? await db.select().from(todoTags).where(inArray(todoTags.id, allTagIds))
    : []

  return { code: 0, data: { tags }, message: '标签已更新' }
})