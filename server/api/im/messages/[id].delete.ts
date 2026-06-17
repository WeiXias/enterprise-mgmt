import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imMessages, imAttachments } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getUploadDir } from '#server-utils/upload'
import { logOperation } from '#server-utils/log'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: msgId } = getRouterParams(event)

  const msg = await db.select({
    id: imMessages.id,
    senderId: imMessages.senderId,
    type: imMessages.type,
    content: imMessages.content,
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

  // 如果是文件消息，清理附件和物理文件
  if (msg[0].type === 'file' && msg[0].content) {
    try {
      const parsed = JSON.parse(msg[0].content)
      const attId = parsed.attachmentId
      if (attId) {
        const attRows = await db.select({ id: imAttachments.id, filePath: imAttachments.filePath })
          .from(imAttachments).where(eq(imAttachments.id, attId)).limit(1)
        if (attRows.length > 0 && attRows[0].filePath) {
          try {
            const uploadDir = await getUploadDir()
            const relativePath = attRows[0].filePath.replace(/^\/uploads\//, '')
            const filePath = path.join(uploadDir, relativePath)
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
          } catch { /* 文件不存在无所谓 */ }
        }
        await db.delete(imAttachments).where(eq(imAttachments.id, attId))
      }
    } catch { /* content 解析失败就跳过 */ }
  }

  await db.update(imMessages).set({ deletedAt: now, updatedAt: now }).where(eq(imMessages.id, msgId))

  await logOperation(event, {
    action: 'DELETE',
    module: 'im',
    targetId: msgId,
    detail: '撤回了一条消息',
  })

  return { code: 0, data: null, message: '消息已撤回' }
})
