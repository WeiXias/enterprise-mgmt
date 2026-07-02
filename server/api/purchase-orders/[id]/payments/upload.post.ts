import { defineEventHandler, getRouterParams, createError } from 'h3'
import { saveUploadedFile } from '#server-utils/upload'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: orderId } = getRouterParams(event)

  const saved = await saveUploadedFile({
    event,
    subDir: 'purchase-payments',
    entityId: orderId,
    maxSize: 20 * 1024 * 1024,
  })

  return { code: 0, data: { filePath: saved.dbPath, fileName: saved.safeName, fileSize: saved.fileSize } }
})
