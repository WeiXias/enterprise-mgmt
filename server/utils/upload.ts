import path from 'path'
import fs from 'fs'
import { readMultipartFormData, createError, H3Event } from 'h3'
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

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

export const DEFAULT_MAX_SIZE = 20 * 1024 * 1024
export const DEFAULT_IMAGE_MAX_SIZE = 10 * 1024 * 1024
export const DEFAULT_ALLOWED_MIME_TYPES = Object.values(MIME_MAP)

export interface SaveUploadedFileOptions {
  event: H3Event
  /** 模块子目录，如 'contracts' */
  subDir?: string
  /** 业务实体 ID，传入后文件写入 subDir/entityId/ 下 */
  entityId?: string
  maxSize?: number
  allowedMimeTypes?: string[]
  /** 固定文件名（logo 场景），可传字符串或接收 safeName 的回调 */
  fixedName?: string | ((safeName: string) => string)
}

export interface SavedFile {
  safeName: string
  relativePath: string
  dbPath: string
  absolutePath: string
  fileSize: number
  mimeType: string
}

export async function saveUploadedFile(opts: SaveUploadedFileOptions): Promise<SavedFile> {
  const maxSize = opts.maxSize ?? DEFAULT_MAX_SIZE
  const allowed = opts.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES

  const files = await readMultipartFormData(opts.event)
  if (!files || files.length === 0) {
    throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })
  }

  const file = files[0]!
  if (!file.data || file.data.length === 0) {
    throw createError({ statusCode: 422, statusMessage: '文件内容为空' })
  }

  // 大小校验
  if (file.data.length > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024)
    throw createError({ statusCode: 422, statusMessage: `文件不能超过 ${maxMB}MB` })
  }

  // MIME 白名单校验（application/octet-stream 跳过，浏览器有时不给具体类型）
  if (file.type && file.type !== 'application/octet-stream' && !allowed.includes(file.type)) {
    throw createError({ statusCode: 422, statusMessage: '不支持这个文件格式，换个文件试试？' })
  }

  // 构建目标目录
  const uploadDir = await getUploadDir()
  let targetDir = uploadDir
  if (opts.subDir) {
    targetDir = opts.entityId
      ? path.join(uploadDir, opts.subDir, opts.entityId)
      : path.join(uploadDir, opts.subDir)
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  // 生成文件名
  const safeName = safeFileName(file.filename)
  const diskName = typeof opts.fixedName === 'function' ? opts.fixedName(safeName) : opts.fixedName ?? `${Date.now()}-${safeName}`
  const absolutePath = path.join(targetDir, diskName)

  // 写磁盘
  fs.writeFileSync(absolutePath, file.data)

  // 构建路径
  let relativePath: string
  if (opts.subDir) {
    relativePath = opts.entityId
      ? `${opts.subDir}/${opts.entityId}/${diskName}`
      : `${opts.subDir}/${diskName}`
  } else {
    relativePath = diskName
  }

  return {
    safeName,
    relativePath,
    dbPath: `/uploads/${relativePath}`,
    absolutePath,
    fileSize: file.data.length,
    mimeType: file.type || 'application/octet-stream',
  }
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
