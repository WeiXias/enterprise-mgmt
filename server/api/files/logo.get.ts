import { defineEventHandler, setHeader, createError } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const [row] = await db.select().from(systemConfig).where(eq(systemConfig.key, 'company_logo')).limit(1)
  if (!row?.value) throw createError({ statusCode: 404, statusMessage: '未设置 Logo' })

  const uploadDir = await getUploadDir()
  const relativePath = row.value.replace(/^\/uploads\//, '')
  const filePath = path.join(uploadDir, relativePath)

  if (!fs.existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: 'Logo 文件不存在' })

  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  }
  setHeader(event, 'Content-Type', mimeMap[ext] || 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  return fs.createReadStream(filePath)
})
