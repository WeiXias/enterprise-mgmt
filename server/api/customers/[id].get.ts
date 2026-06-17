import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { customers, contacts, followUps, customerTags, tags } from '#schema/customers'
import { opportunities } from '#schema/opportunities'
import { contracts } from '#schema/contracts'
import { users } from '#schema/users'
import { eq, and, isNull, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const custResult = await db.select().from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt))).limit(1)
  if (custResult.length === 0) throw createError({ statusCode: 404, statusMessage: '客户不存在' })

  // 权限检查
  if (user.role === 'sales_member' && custResult[0].ownerUserId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '这个客户不是你负责的' })
  }

  const c = custResult[0]
  const owner = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, c!.ownerUserId)).limit(1)

  const contactList = await db.select({
    id: contacts.id,
    customerId: contacts.customerId,
    name: contacts.name,
    position: contacts.position,
    phone: contacts.phone,
    email: contacts.email,
    isPrimary: contacts.isPrimary,
    remark: contacts.remark,
    createdAt: contacts.createdAt,
  }).from(contacts).where(and(eq(contacts.customerId, id), isNull(contacts.deletedAt))).orderBy(desc(contacts.isPrimary))

  const tagList = await db.select({ id: tags.id, name: tags.name, color: tags.color }).from(customerTags)
    .leftJoin(tags, eq(customerTags.tagId, tags.id))
    .where(eq(customerTags.customerId, id))

  const followUpList = await db.select({
    id: followUps.id,
    customerId: followUps.customerId,
    userId: followUps.userId,
    type: followUps.type,
    content: followUps.content,
    nextFollowUpAt: followUps.nextFollowUpAt,
    createdAt: followUps.createdAt,
  }).from(followUps).where(eq(followUps.customerId, id)).limit(20).orderBy(desc(followUps.createdAt))

  const oppList = await db.select({ id: opportunities.id, name: opportunities.name, status: opportunities.status, amount: opportunities.estimatedAmount })
    .from(opportunities).where(and(eq(opportunities.customerId, id), isNull(opportunities.deletedAt))).limit(10)

  const contractList = await db.select({ id: contracts.id, code: contracts.code, name: contracts.name, status: contracts.status, totalAmount: contracts.totalAmount })
    .from(contracts).where(and(eq(contracts.customerId, id), isNull(contracts.deletedAt))).limit(10)

  return {
    code: 0,
    data: {
      id: c!.id,
      name: c!.name,
      industry: c!.industry,
      address: c!.registeredAddress || c.officeAddress || null,
      registeredAddress: c!.registeredAddress,
      officeAddress: c!.officeAddress,
      remark: c!.remark,
      status: c!.status,
      ownerUserId: c!.ownerUserId,
      owner: owner[0] || null,
      lostReason: c!.lostReason,
      tags: tagList.filter((t: any) => t.id !== null),
      contacts: contactList.map((ct: any) => ({
        id: ct.id,
        name: ct.name,
        position: ct.position,
        phone: ct.phone,
        email: ct.email,
        isPrimary: ct.isPrimary,
        remark: ct.remark,
      })),
      latestFollowUps: followUpList.map((fu: any) => ({
        id: fu.id,
        type: fu.type,
        content: fu.content,
        nextFollowUpAt: fu.nextFollowUpAt,
        createdAt: fu.createdAt,
        userId: fu.userId,
      })),
      opportunities: oppList,
      contracts: contractList,
      createdAt: c!.createdAt,
      updatedAt: c!.updatedAt,
    }
  }
})
