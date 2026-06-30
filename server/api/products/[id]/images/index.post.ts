import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { productImages } from '#schema/products'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { saveUploadedFile } from '#server-utils/upload'
import { requirePermission } from '#server-utils/permission'

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: productId } = getRouterParams(event)

  const saved = await saveUploadedFile({
    event,
    subDir: 'products',
    entityId: productId,
    maxSize: 10 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME,
  })

  const existing = await db.select().from(productImages).where(eq(productImages.productId, productId))
  const nextSort = existing.length

  const result = await db.insert(productImages).values({
    id: generateId(),
    productId,
    fileName: saved.safeName,
    filePath: saved.dbPath,
    fileSize: saved.fileSize,
    sort: nextSort,
    uploadedBy: user.userId,
    contentHash: saved.contentHash,
    createdAt: new Date().toISOString(),
  }).returning()

  return { code: 0, data: result[0], message: '图片已上传' }
})
