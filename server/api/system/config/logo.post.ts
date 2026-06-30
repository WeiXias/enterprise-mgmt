import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import { saveUploadedFile } from '#server-utils/upload'
import path from 'path'
import { requirePermission } from '#server-utils/permission'

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'system:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const saved = await saveUploadedFile({
    event,
    fixedName: (safeName: string) => `logo${path.extname(safeName).toLowerCase() || '.png'}`,
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: IMAGE_MIME,
  })

  const [existing] = await db.select().from(systemConfig).where(eq(systemConfig.key, 'company_logo')).limit(1)
  if (existing) {
    await db.update(systemConfig).set({ value: saved.dbPath }).where(eq(systemConfig.key, 'company_logo'))
  } else {
    const { generateId } = await import('#server-utils/id')
    await db.insert(systemConfig).values({ id: generateId(), key: 'company_logo', value: saved.dbPath })
  }

  return { code: 0, data: { logoPath: saved.dbPath }, message: 'Logo 已上传' }
})
