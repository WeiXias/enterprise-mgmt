import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
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

/** 允许的文件扩展名（白名单） */
const ALLOWED_EXTENSIONS = Object.keys(MIME_MAP)

/** 通过文件头 magic bytes 检测真实类型，防止 MIME 伪造 */
function detectTypeByMagic(data: Buffer): string | null {
  // PDF: %PDF-
  if (data.length >= 5 && data.slice(0, 5).toString() === '%PDF-') return 'application/pdf'
  // PNG: 89 50 4E 47
  if (data.length >= 4 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 'image/png'
  // JPEG: FF D8 FF
  if (data.length >= 3 && data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'image/jpeg'
  // GIF: GIF89a or GIF87a
  if (data.length >= 6 && (data.slice(0, 6).toString() === 'GIF89a' || data.slice(0, 6).toString() === 'GIF87a')) return 'image/gif'
  // WebP: RIFF....WEBP
  if (data.length >= 12 && data.slice(0, 4).toString() === 'RIFF' && data.slice(8, 12).toString() === 'WEBP') return 'image/webp'
  // SVG: 文本型，检测是否以 <svg 或 <?xml 开头且包含 <svg
  if (data.length >= 4) {
    const head = data.slice(0, 256).toString('utf8').trimStart()
    if (/^\s*<(svg|SVG)\b/.test(head) || (/^\s*<\?xml/.test(head) && head.includes('<svg'))) return 'image/svg+xml'
  }
  // ZIP-based (DOCX/XLSX/PPTX): 50 4B 03 04
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4B && data[2] === 0x03 && data[3] === 0x04) {
    // 通过 [Content_Types].xml 中的 Override 区分具体 Office 类型
    const content = data.toString('utf8', 0, Math.min(data.length, 8192))
    if (content.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    if (content.includes('xl/')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (content.includes('ppt/')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    return 'application/vnd.openxmlformats-officedocument' // 兜底：Office 系列，放行
  }
  // OLE2-based (DOC/XLS/PPT): D0 CF 11 E0
  if (data.length >= 4 && data[0] === 0xD0 && data[1] === 0xCF && data[2] === 0x11 && data[3] === 0xE0) {
    return 'application/octet-stream' // 旧 Office 格式，放行
  }
  return null // 无法识别
}

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
  contentHash: string
}

export function computeContentHash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
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

  // 扩展名白名单校验
  const ext = path.extname(file.filename || '').toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw createError({ statusCode: 422, statusMessage: '不支持这个文件格式，换个文件试试？' })
  }

  // Magic bytes 真实类型检测
  const magicType = detectTypeByMagic(file.data)
  if (magicType === null) {
    throw createError({ statusCode: 422, statusMessage: '文件内容无法识别，换个文件试试？' })
  }

  // MIME 白名单校验（优先 magic bytes，其次客户端声明）
  const effectiveMime = magicType || file.type
  if (effectiveMime !== 'application/octet-stream' && !allowed.includes(effectiveMime)) {
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

  // 生成安全文件名（hash 前缀去重）
  const safeName = safeFileName(file.filename)
  const contentHash = computeContentHash(file.data)
  const hashPrefix = contentHash.slice(0, 16)
  const diskName = typeof opts.fixedName === 'function' ? opts.fixedName(safeName) : opts.fixedName ?? `${hashPrefix}-${safeName}`
  const absolutePath = path.join(targetDir, diskName)

  // 写磁盘（文件已存在则跳过，去重）
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, file.data)
  }

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
    mimeType: effectiveMime,
    contentHash,
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

/** 安全文件名：剥离路径遍历，清理特殊字符，补充缺失扩展名 */
export function safeFileName(raw: string | undefined): string {
  const name = raw || 'unnamed'
  // 1. 剥离路径
  const base = path.basename(name)
  // 2. 最多保留一层扩展名
  const dotIndex = base.lastIndexOf('.')
  if (dotIndex <= 0) return sanitize(base)
  const stem = base.slice(0, dotIndex)
  const ext = base.slice(dotIndex).toLowerCase()
  // 3. 清理主干中的特殊字符
  return sanitize(stem) + ext
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9一-鿿_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'file'
}
