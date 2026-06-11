import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })

  const file = files[0]
  if (!file.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })

  const ext = path.extname(file.filename || 'logo.png').toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
    throw createError({ statusCode: 422, statusMessage: '只支持图片格式 (png/jpg/gif/webp/svg)' })
  }

  const uploadDir = await getUploadDir()
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const fileName = `logo${ext}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, file.data)

  // 更新或插入系统配置
  const [existing] = await db.select().from(systemConfig).where(eq(systemConfig.key, 'company_logo')).limit(1)
  if (existing) {
    await db.update(systemConfig).set({ value: `/uploads/${fileName}` }).where(eq(systemConfig.key, 'company_logo'))
  } else {
    const { generateId } = await import('#server-utils/id')
    await db.insert(systemConfig).values({ id: generateId(), key: 'company_logo', value: `/uploads/${fileName}` })
  }

  return { code: 0, data: { logoPath: `/uploads/${fileName}` }, message: 'Logo 已上传' }
})
