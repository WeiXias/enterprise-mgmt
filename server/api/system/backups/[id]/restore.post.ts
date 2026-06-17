import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { backups } from '#schema/system'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

function resolveDbPath(): string {
  if (process.env.DB_PATH) return path.resolve(process.env.DB_PATH)
  const newPath = path.resolve('data/db/enterprise.db')
  const oldPath = path.resolve('data/enterprise.db')
  return fs.existsSync(oldPath) ? oldPath : newPath
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:backup')

  const { id } = getRouterParams(event)

  const [backup] = await db.select().from(backups).where(eq(backups.id, id)).limit(1)
  if (!backup) throw createError({ statusCode: 404, statusMessage: '备份不存在' })

  const dbPath = resolveDbPath()
  if (fs.existsSync(backup.filePath)) {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(backup.filePath, dbPath)
  }

  return { code: 0, data: null, message: '备份已恢复，请重启服务以生效' }
})
