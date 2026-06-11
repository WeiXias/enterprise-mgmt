import { defineEventHandler, getRouterParams, createError, readMultipartFormData } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema/projects'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: deliverables.id }).from(deliverables)
    .where(eq(deliverables.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '交付物不存在' })

  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })

  const file = files[0]
  if (!file.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })

  const uploadDir = await getUploadDir()
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const fileName = `${Date.now()}-${file.filename || 'unnamed'}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, file.data)

  await db.update(deliverables).set({
    filePath: `/uploads/${fileName}`,
    status: 'submitted',
  }).where(eq(deliverables.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'deliverable', targetId: id, detail: '上传了交付物文件' })

  return { code: 0, data: null, message: '文件已上传' }
})