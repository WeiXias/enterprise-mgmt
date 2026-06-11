import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { backups } from '#schema/system'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:backup')

  const { id } = getRouterParams(event)

  const [backup] = await db.select().from(backups).where(eq(backups.id, id)).limit(1)
  if (!backup) throw createError({ statusCode: 404, statusMessage: '备份不存在' })

  const dbPath = path.resolve('data/enterprise.db')
  if (fs.existsSync(backup.filePath)) {
    fs.copyFileSync(backup.filePath, dbPath)
  }

  return { code: 0, data: null, message: '备份已恢复，请重启服务以生效' }
})
