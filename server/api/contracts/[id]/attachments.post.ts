import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { generateId } from '#server-utils/id'
import { saveUploadedFile } from '#server-utils/upload'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: contractId } = getRouterParams(event)

  const saved = await saveUploadedFile({
    event,
    subDir: 'contracts',
    entityId: contractId,
    maxSize: 20 * 1024 * 1024,
  })

  const result = await db.insert(contractAttachments).values({
    id: generateId(),
    contractId,
    fileName: saved.safeName,
    filePath: saved.dbPath,
    fileSize: saved.fileSize,
    contentHash: saved.contentHash,
    uploadedBy: user.userId,
    createdAt: new Date().toISOString(),
  }).returning()

  return { code: 0, data: result[0], message: '附件已上传' }
})
