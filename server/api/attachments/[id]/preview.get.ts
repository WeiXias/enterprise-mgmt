import { defineEventHandler, getRouterParams, getQuery, createError, setHeader } from 'h3'
import { db } from '#database'
import { contractAttachments } from '#schema/contracts'
import { deliverables } from '#schema/projects'
import { eq } from 'drizzle-orm'
import { getUploadDir, getContentType } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'attachment:read')
  const { source } = getQuery(event) as { source?: string }

  let record: { id: string; fileName?: string; filePath?: string } | undefined
  if (source === 'deliverable') {
    const rows = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1)
    record = rows[0] ?? undefined
  } else {
    const rows = await db.select().from(contractAttachments).where(eq(contractAttachments.id, id)).limit(1)
    record = rows[0] ?? undefined
  }

  if (!record) throw createError({ statusCode: 404, statusMessage: '文件不存在' })
  if (!record.filePath) throw createError({ statusCode: 404, statusMessage: '文件路径为空' })

  const uploadDir = await getUploadDir()
  const relativePath = record.filePath.replace(/^\/uploads\//, '')
  const filePath = path.join(uploadDir, relativePath)

  if (!fs.existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: '文件在磁盘上找不到了' })

  const fileName = record.fileName || path.basename(relativePath)
  const ext = path.extname(fileName).toLowerCase()
  const buffer = fs.readFileSync(filePath)

  // Office 文档转换为 HTML
  if (['.docx', '.dotx'].includes(ext)) {
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ buffer })
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.8}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px}</style></head><body>${(result as { value: string }).value}</body></html>`
  }

  if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetNames = wb.SheetNames
    const tabs = sheetNames.map(name => {
      const html = XLSX.utils.sheet_to_html(wb.Sheets[name]!, { id: name })
      return `<div class="sheet"><h2 style="font-size:16px;margin-bottom:8px;color:#555">${name}</h2>${html}</div>`
    }).join('\n')
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;max-width:1200px;margin:20px auto;padding:0 20px;line-height:1.6}.sheet{margin-bottom:24px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:4px 8px}th{background:#f5f5f5}</style></head><body>${tabs}</body></html>`
  }

  if (['.pptx', '.pptm'].includes(ext)) {
    const { parseOffice } = await import('officeparser')
    const result = await parseOffice(buffer, { fileType: ext.slice(1), outputFormat: 'html' })
    const html = typeof result === 'string' ? result : JSON.stringify(result)
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return typeof html === 'string' ? html : String(html)
  }

  // 图片、PDF、其他 - 流式返回原始文件
  const contentType = getContentType(fileName)
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return fs.createReadStream(filePath)
})
