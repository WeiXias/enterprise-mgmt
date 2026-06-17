import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imAttachments, imMessages } from '#schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { saveUploadedFile } from '#server-utils/upload'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)

  const member = await db.select({ id: imMembers.id }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })

  const saved = await saveUploadedFile({
    event,
    subDir: 'im',
    entityId: convId,
    maxSize: 20 * 1024 * 1024,
  })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const msgId = generateId()
  const attId = generateId()

  await db.insert(imMessages).values({
    id: msgId, conversationId: convId, senderId: user.userId, type: 'file',
    content: JSON.stringify({ fileName: saved.safeName, fileSize: saved.fileSize, fileType: saved.mimeType, attachmentId: attId }),
    createdAt: now, updatedAt: now,
  })

  await db.insert(imAttachments).values({
    id: attId, messageId: msgId, fileName: saved.safeName,
    filePath: saved.dbPath, fileSize: saved.fileSize, fileType: saved.mimeType,
    contentHash: saved.contentHash,
    uploadedBy: user.userId, createdAt: now,
  })

  await db.update(imConversations).set({ updatedAt: now }).where(eq(imConversations.id, convId))

  return {
    code: 0,
    data: {
      message: { id: msgId, type: 'file', content: JSON.stringify({ fileName: saved.safeName, fileSize: saved.fileSize, fileType: saved.mimeType, attachmentId: attId }), createdAt: now },
      attachment: { id: attId, fileName: saved.safeName, fileSize: saved.fileSize, fileType: saved.mimeType },
    },
    message: '文件已发送',
  }
})
