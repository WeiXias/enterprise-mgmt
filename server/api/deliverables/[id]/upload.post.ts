import { defineEventHandler, getRouterParams, createError, readMultipartFormData } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { eq } from 'drizzle-orm'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const UPLOAD_DIR = path.resolve('data/uploads/deliverables')

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'deliverable:edit')

  const formData = await readMultipartFormData(event)
  if (!formData?.length) throw createError({ statusCode: 422, statusMessage: '请选择文件' })

  const file = formData[0]
  if (!file.filename) throw createError({ statusCode: 422, statusMessage: '文件名不能为空' })

  const ext = path.extname(file.filename)
  const fileName = `${generateId()}${ext}`
  const relativePath = `/uploads/deliverables/${fileName}`

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

  await writeFile(path.join(UPLOAD_DIR, fileName), file.data)

  await db.update(deliverables).set({ filePath: relativePath, status: 'submitted' }).where(eq(deliverables.id, id))
  await logOperation(event, { action: 'UPLOAD', module: 'deliverable', targetId: id, detail: `上传了文件「${file.filename}」` })

  return { code: 0, data: { filePath: relativePath }, message: '文件已上传' }
})
