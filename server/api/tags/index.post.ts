import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { dictEntries } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式不对').optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'tag:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const tagId = generateId()
  await db.insert(tags).values({
    id: tagId,
    name: parsed.data.name,
    color: parsed.data.color || null,
    createdAt: now,
  }).returning()
  await db.insert(dictEntries).values({
    id: generateId(),
    dict_type: 'customer_tag',
    value: parsed.data.name,
    label: parsed.data.name,
    sort: '0',
    is_active: '1',
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'tag', targetId: tagId, detail: `创建了标签「${parsed.data.name}」` })
  return { code: 0, data: { id: tagId }, message: '标签已添加' }
})
