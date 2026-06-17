import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema'
import { eq, isNull, and } from 'drizzle-orm'
import { getUploadDir } from '#server-utils/upload'
import { logOperation } from '#server-utils/log'
import path from 'path'
import fs from 'fs'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  const existing = await db.select({
    id: contractAttachments.id,
    filePath: contractAttachments.filePath,
  }).from(contractAttachments)
    .where(and(eq(contractAttachments.id, id), isNull(contractAttachments.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '附件不存在' })

  const row = existing[0]!

  // 清理物理文件
  try {
    const uploadDir = await getUploadDir()
    const relativePath = row.filePath.replace(/^\/uploads\//, '')
    const filePath = path.join(uploadDir, relativePath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch { /* 文件不存在无所谓 */ }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(contractAttachments).set({ deletedAt: now } as any).where(eq(contractAttachments.id, id))
  await logOperation(event, { action: 'DELETE', module: 'attachment', targetId: id, detail: '删除了附件' })
  return { code: 0, data: null, message: '附件已删除' }
})
