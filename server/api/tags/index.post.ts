import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'

const schema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式不对').optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const tagId = generateId()
  const result = await db.insert(tags).values({
    id: tagId,
    name: parsed.data.name,
    color: parsed.data.color || null,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'tag', targetId: tagId, detail: `创建了标签「${parsed.data.name}」` })
  return { code: 0, data: result[0], message: '标签已添加' }
})
