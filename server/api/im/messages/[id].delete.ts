import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imMessages } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: msgId } = getRouterParams(event)

  const msg = await db.select({
    id: imMessages.id,
    senderId: imMessages.senderId,
    conversationId: imMessages.conversationId,
    deletedAt: imMessages.deletedAt,
  })
    .from(imMessages)
    .where(eq(imMessages.id, msgId))
    .limit(1)

  if (msg.length === 0) throw createError({ statusCode: 404, statusMessage: '消息不存在' })

  if (msg[0].senderId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '只能撤回自己的消息' })
  }

  if (msg[0].deletedAt) {
    throw createError({ statusCode: 400, statusMessage: '消息已撤回，不能重复操作' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(imMessages).set({ deletedAt: now, updatedAt: now }).where(eq(imMessages.id, msgId))

  await logOperation(event, {
    action: 'DELETE',
    module: 'im',
    targetId: msgId,
    detail: '撤回了一条消息',
  })

  return { code: 0, data: null, message: '消息已撤回' }
})
