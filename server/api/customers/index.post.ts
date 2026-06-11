import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { customers, customerTags, contacts } from '#schema/customers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1, '客户名称不能为空').max(200),
  industry: z.string().optional(),
  registeredAddress: z.string().optional(),
  officeAddress: z.string().optional(),
  remark: z.string().optional(),
  ownerUserId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  // 联系人信息
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('邮箱格式不对').optional().or(z.literal('')),
  contactPosition: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const msgs = parsed.error.issues.map(i => i.message).join('; ')
    throw createError({ statusCode: 422, statusMessage: msgs })
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const customerId = generateId()

  await db.insert(customers).values({
    id: customerId,
    name: parsed.data.name,
    industry: parsed.data.industry || null,
    registeredAddress: parsed.data.registeredAddress || null,
    officeAddress: parsed.data.officeAddress || null,
    remark: parsed.data.remark || null,
    status: 'potential',
    ownerUserId: parsed.data.ownerUserId || user.userId,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'customer', targetId: customerId, detail: `创建了客户「${parsed.data.name}」` })

  // 如果有联系人信息，同时创建
  if (parsed.data.contactName) {
    await db.insert(contacts).values({
      id: generateId(),
      customerId,
      name: parsed.data.contactName,
      phone: parsed.data.contactPhone || null,
      email: parsed.data.contactEmail || null,
      position: parsed.data.contactPosition || null,
      isPrimary: true,
      createdAt: now,
    })
  }

  // 打标签
  if (parsed.data.tagIds && parsed.data.tagIds.length > 0) {
    await db.insert(customerTags).values(
      parsed.data.tagIds.map(tagId => ({ customerId, tagId }))
    )
  }

  return { code: 0, data: { id: customerId }, message: '搞定了！客户已添加' }
})
