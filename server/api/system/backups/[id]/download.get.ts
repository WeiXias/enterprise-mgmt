import { defineEventHandler, getRouterParams, createError, sendStream } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { backups } from '#schema/system'
import { eq } from 'drizzle-orm'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:backup')

  const { id } = getRouterParams(event)
  const [backup] = await db.select().from(backups).where(eq(backups.id, id)).limit(1)
  if (!backup) throw createError({ statusCode: 404, statusMessage: '备份不存在' })
  if (!fs.existsSync(backup.filePath)) throw createError({ statusCode: 404, statusMessage: '备份文件已丢失' })

  const stats = fs.statSync(backup.filePath)
  setResponseHeaders(event, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${backup.fileName}"`,
    'Content-Length': String(stats.size),
  })
  return sendStream(event, fs.createReadStream(backup.filePath))
})
