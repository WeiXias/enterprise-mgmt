import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { getUploadDir, getContentType } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const { path: filePath, token } = getQuery(event) as { path?: string; token?: string }

  // token 由前端通过 auth store 传入，这里不做校验（只做文件安全校验）
  if (!filePath) throw createError({ statusCode: 422, statusMessage: '缺少文件路径' })

  // 安全检查：路径必须以 /uploads/ 开头，防止目录穿越
  if (!filePath.startsWith('/uploads/')) {
    throw createError({ statusCode: 403, statusMessage: '不允许的路径' })
  }

  // 防目录穿越：normalize 后仍然以 uploads 目录为根
  const uploadDir = await getUploadDir()
  const relativePath = filePath.replace(/^\/uploads\//, '')
  const absolutePath = path.resolve(uploadDir, relativePath)

  // 确保解析后的路径在 uploadDir 内
  if (!absolutePath.startsWith(uploadDir)) {
    throw createError({ statusCode: 403, statusMessage: '不允许的路径' })
  }

  if (!fs.existsSync(absolutePath)) {
    throw createError({ statusCode: 404, statusMessage: '文件找不到了' })
  }

  const fileName = path.basename(relativePath)
  const ext = path.extname(fileName).toLowerCase()
  const buffer = fs.readFileSync(absolutePath)

  // Office 文档（docx）转换 HTML
  if (['.docx', '.dotx'].includes(ext)) {
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ buffer })
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.8}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px}</style></head><body>${result.value}</body></html>`
  }

  // 电子表格转换 HTML
  if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const tabs = wb.SheetNames.map(name => {
      const html = XLSX.utils.sheet_to_html(wb.Sheets[name]!, { id: name })
      return `<div class="sheet"><h2>${name}</h2>${html}</div>`
    }).join('\n')
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;max-width:1200px;margin:20px auto;padding:0 20px;line-height:1.6}.sheet{margin-bottom:24px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:4px 8px}th{background:#f5f5f5}</style></head><body>${tabs}</body></html>`
  }

  // 其他：流式返回原文件（图片、PDF 等）
  const contentType = getContentType(fileName)
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return fs.createReadStream(absolutePath)
})
