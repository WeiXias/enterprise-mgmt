import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema/projects'
import { eq } from 'drizzle-orm'
import { saveUploadedFile } from '#server-utils/upload'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  const existing = await db.select({ id: deliverables.id, projectId: deliverables.projectId })
    .from(deliverables).where(eq(deliverables.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '交付物不存在' })

  const { projectId } = existing[0]!

  const saved = await saveUploadedFile({
    event,
    subDir: `projects/${projectId}/deliverables`,
  })

  await db.update(deliverables).set({
    filePath: saved.dbPath,
    status: 'submitted',
  }).where(eq(deliverables.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'deliverable', targetId: id, detail: '上传了交付物文件' })

  return { code: 0, data: null, message: '文件已上传' }
})
