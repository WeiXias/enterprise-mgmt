import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imAttachments, imMessages, users } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { getUploadDir, safeFileName } from '#server-utils/upload'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)

  const member = await db.select({ id: imMembers.id }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })

  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '请选择文件' })

  const file = files[0]
  if (!file!.data || file.data.length === 0) throw createError({ statusCode: 422, statusMessage: '文件为空' })
  const maxSize = 20 * 1024 * 1024
  if (file!.data.length > maxSize) throw createError({ statusCode: 422, statusMessage: '文件不能超过20MB' })

  const uploadDir = await getUploadDir()
  const fs = await import('fs')
  const path = await import('path')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const safeName = safeFileName(file!.filename)
  const fileName = `${Date.now()}-${safeName}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, file!.data)

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const msgId = generateId()
  const attId = generateId()

  // 创建文件消息
  await db.insert(imMessages).values({
    id: msgId, conversationId: convId, senderId: user.userId, type: 'file',
    content: JSON.stringify({ fileName: safeName, fileSize: file.data.length, fileType: file.type || 'application/octet-stream', attachmentId: attId }),
    createdAt: now, updatedAt: now,
  })

  // 创建附件记录
  await db.insert(imAttachments).values({
    id: attId, messageId: msgId, fileName: safeName,
    filePath: `/uploads/${fileName}`, fileSize: file!.data.length, fileType: file.type || 'application/octet-stream',
    uploadedBy: user.userId, createdAt: now,
  })

  // 更新会话时间
  await db.update(imConversations).set({ updatedAt: now }).where(eq(imConversations.id, convId))

  return {
    code: 0,
    data: {
      message: { id: msgId, type: 'file', content: JSON.stringify({ fileName: safeName, fileSize: file.data.length, fileType: file.type || 'application/octet-stream', attachmentId: attId }), createdAt: now },
      attachment: { id: attId, fileName: safeName, fileSize: file.data.length, fileType: file.type || 'application/octet-stream' },
    },
    message: '文件已发送',
  }
})
