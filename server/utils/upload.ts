import path from 'path'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { eq } from 'drizzle-orm'

export async function getUploadDir(): Promise<string> {
  const rows = await db.select({ value: systemConfig.value })
    .from(systemConfig)
    .where(eq(systemConfig.key, 'upload_path'))
    .limit(1)
  const dir = rows[0]?.value || 'data/uploads'
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

export function isImage(fileName: string): boolean {
  const t = getContentType(fileName)
  return t.startsWith('image/')
}

export function isPdf(fileName: string): boolean {
  return getContentType(fileName) === 'application/pdf'
}

export function isOffice(fileName: string): boolean {
  const t = getContentType(fileName)
  return t.includes('officedocument') || t.includes('ms-word') || t.includes('ms-excel') || t.includes('ms-powerpoint')
}

export function safeFileName(raw: string | undefined): string {
  const name = raw || 'unnamed'
  return path.basename(name)
}
