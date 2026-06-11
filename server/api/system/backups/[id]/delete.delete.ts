import { defineEventHandler, getRouterParams, createError } from 'h3'
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

  try { fs.unlinkSync(backup.filePath) } catch { /* ignore */ }
  await db.delete(backups).where(eq(backups.id, id))

  return { code: 0, data: null, message: '备份已删除' }
})
