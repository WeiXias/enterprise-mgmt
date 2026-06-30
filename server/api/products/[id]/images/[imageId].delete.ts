import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { productImages } from '#schema/products'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { getUploadDir } from '#server-utils/upload'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product:delete')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { imageId } = getRouterParams(event)

  const rows = await db.select().from(productImages).where(eq(productImages.id, imageId)).limit(1)
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: '图片不存在' })

  const img = rows[0]!

  // 删除物理文件
  try {
    const uploadDir = await getUploadDir()
    const relativePath = img.filePath.replace(/^\/uploads\//, '')
    const filePath = path.join(uploadDir, relativePath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch { /* 文件不存在无所谓 */ }

  await db.delete(productImages).where(eq(productImages.id, imageId))

  return { code: 0, message: '图片已删除' }
})
