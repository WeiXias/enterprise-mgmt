import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { customers, contacts, tags, customerTags } from '#schema/customers'
import { users } from '#schema/users'
import { eq, like, and, isNull, count, desc, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const status = query.status as string | undefined
  const industry = query.industry as string | undefined

  const where: any[] = [isNull(customers.deletedAt)]
  if (keyword) where.push(like(customers.name, `%${keyword}%`))
  if (status) where.push(eq(customers.status, status))
  if (industry) where.push(eq(customers.industry, industry))
  if (user.role === 'sales' || user.role === 'sales_member') where.push(eq(customers.ownerUserId, user.userId))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: customers.id,
      name: customers.name,
      industry: customers.industry,
      status: customers.status,
      ownerId: customers.ownerUserId,
      ownerName: users.name,
      registeredAddress: customers.registeredAddress,
      officeAddress: customers.officeAddress,
      remark: customers.remark,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    }).from(customers)
      .leftJoin(users, eq(customers.ownerUserId, users.id))
      .where(and(...where))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(customers.updatedAt)),
    db.select({ count: count() }).from(customers).where(and(...where)),
  ])

  // 批量获取主联系人和标签
  const customerIds = list.map((c: any) => c.id)
  let primaryContacts: { customerId: string, name: string, phone: string }[] = []
  let allTags: { customerId: string, name: string, color: string }[] = []

  if (customerIds.length > 0) {
    [primaryContacts, allTags] = await Promise.all([
      db.select({
        customerId: contacts.customerId,
        name: contacts.name,
        phone: contacts.phone,
      }).from(contacts)
        .where(and(inArray(contacts.customerId, customerIds), eq(contacts.isPrimary, true))),
      db.select({
        customerId: customerTags.customerId,
        id: tags.id,
        name: tags.name,
        color: tags.color,
      }).from(customerTags)
        .leftJoin(tags, eq(customerTags.tagId, tags.id))
        .where(inArray(customerTags.customerId, customerIds)),
    ])
  }

  // 构建 map
  const contactMap: Record<string, any> = {}
  primaryContacts.forEach(c => { contactMap[c.customerId] = { name: c.name, phone: c.phone } })

  const tagMap: Record<string, any[]> = {}
  allTags.forEach(t => {
    if (!tagMap[t.customerId]) tagMap[t.customerId] = []
    if (t.id) tagMap[t.customerId].push({ id: t.id, name: t.name, color: t.color })
  })

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((c: any) => ({
        ...c,
        owner: { id: c.ownerId, name: c.ownerName },
        primaryContact: contactMap[c.id] || null,
        tags: tagMap[c.id] || [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
