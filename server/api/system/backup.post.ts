import { defineEventHandler, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { backups } from '#schema/system'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'system:backup')

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')
  const fileName = `backup-${dateStr}.db`

  const backupDir = path.resolve('data/backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const filePath = path.join(backupDir, fileName)

  // 尝试复制 SQLite 数据库文件
  const dbPath = path.resolve('data/enterprise.db')
  if (!fs.existsSync(dbPath)) {
    throw createError({ statusCode: 500, statusMessage: '数据库文件不存在' })
  }
  fs.copyFileSync(dbPath, filePath)
  const fileSize = String(fs.statSync(filePath).size)

  const id = generateId()
  await db.insert(backups).values({
    id,
    fileName,
    filePath,
    fileSize,
    createdBy: user.userId,
  })

  await logOperation(event, { action: 'CREATE', module: 'system', targetId: id, detail: '创建了数据库备份' })

  const record = await db.select().from(backups).where(eq(backups.id, id)).limit(1)
  return { code: 0, data: record[0], message: '备份已完成' }
})
