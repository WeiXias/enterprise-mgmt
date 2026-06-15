import { defineEventHandler, getRouterParams, createError, readMultipartFormData } from 'h3'
import { db } from '#database'
import { productImages } from '#schema/products'
import { generateId } from '#server-utils/id'
import { getUploadDir, safeFileName } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: productId } = getRouterParams(event)
  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })

  const file = files[0]!
  if (!file.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })

  const fileSize = file.data.length
  if (fileSize > 10 * 1024 * 1024) throw createError({ statusCode: 422, statusMessage: '图片不能超过 10MB' })

  const uploadDir = await getUploadDir()
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const safeName = safeFileName(file.filename)
  const fileName = `${Date.now()}-${safeName}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, file.data)

  // 取当前最大 sort
  const existing = await db.select().from(productImages).where(eq(productImages.productId, productId))
  const nextSort = existing.length

  const result = await db.insert(productImages).values({
    id: generateId(),
    productId,
    fileName: safeName,
    filePath: `/uploads/${fileName}`,
    fileSize,
    sort: nextSort,
    uploadedBy: user.userId,
    createdAt: new Date().toISOString(),
  }).returning()

  return { code: 0, data: result[0], message: '图片已上传' }
})
