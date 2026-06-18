import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { extractPlaceholders } from '#server-utils/contract-template'
import { safeFileName } from '#server-utils/upload'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })
  const uploadFile = files[0]
  if (!uploadFile || !uploadFile.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })

  const fileName = safeFileName(uploadFile.filename)
  if (!fileName.toLowerCase().endsWith('.docx')) {
    throw createError({ statusCode: 422, statusMessage: '只支持 .docx 格式的 Word 文件，换个文件试试？' })
  }

  const fileSize = uploadFile.data.length
  if (fileSize > 20 * 1024 * 1024) throw createError({ statusCode: 422, statusMessage: '文件不能超过 20MB' })

  const buffer = Buffer.from(uploadFile.data)

  // 用 mammoth 提取文本用于占位符检测，同时保留原始 docx buffer 供编辑器使用
  const mammoth = await import('mammoth')
  const convertResult = await mammoth.convertToHtml({ buffer })
  const htmlContent = convertResult.value || ''
  const placeholders = extractPlaceholders(htmlContent)
  const suggestedName = fileName.replace(/\.docx$/i, '')

  return {
    code: 0,
    data: {
      content: htmlContent, // 旧版字段（详情页渲染用）
      docxBuffer: buffer.toString('base64'), // ← 新增：原始 docx 文件（base64），供编辑器加载
      placeholders,
      suggestedName,
    },
    message: 'Word 模板解析完成！',
  }
})
