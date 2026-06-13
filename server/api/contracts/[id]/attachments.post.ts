import { defineEventHandler, getRouterParams, createError, readMultipartFormData } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { generateId } from '#server-utils/id'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })
  const file = files[0]!
  if (!file.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })
  const fileSize = file.data.length
  if (fileSize > 20 * 1024 * 1024) throw createError({ statusCode: 422, statusMessage: '文件不能超过20MB' })

  const uploadDir = await getUploadDir()
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const fileName = `${Date.now()}-${file.filename || 'unnamed'}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, file.data)

  const result = await db.insert(contractAttachments).values({
    id: generateId(), contractId,
    fileName: file.filename || 'unnamed',
    filePath: `/uploads/${fileName}`,
    fileSize,
    uploadedBy: user.userId,
    createdAt: new Date().toISOString(),
  }).returning()
  return { code: 0, data: result[0], message: '附件已上传' }
})
