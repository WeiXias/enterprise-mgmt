import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contacts } from '#schema/customers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1, '联系人名称不能为空').max(100),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不对').optional().or(z.literal('')),
  position: z.string().optional(),
  isPrimary: z.boolean().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contact:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  // 如果是主要联系人，先把其他的改成非主要
  if (parsed.data.isPrimary) {
    await db.update(contacts).set({ isPrimary: false }).where(eq(contacts.customerId, customerId))
  }
  const result = await db.insert(contacts).values({
    id: generateId(),
    customerId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    position: parsed.data.position || null,
    isPrimary: parsed.data.isPrimary || false,
    remark: parsed.data.remark || null,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'contact', targetId: result[0].id, detail: `添加了联系人「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '联系人已添加' }
})
