import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { extractPlaceholders } from '#server-utils/contract-template'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const files = await readMultipartFormData(event)
  if (!files || files.length === 0) throw createError({ statusCode: 422, statusMessage: '还没选文件呢' })
  const uploadFile = files[0]
  if (!uploadFile || !uploadFile.data) throw createError({ statusCode: 422, statusMessage: '文件内容为空' })

  const fileName = uploadFile.filename || 'unnamed'
  if (!fileName.toLowerCase().endsWith('.docx')) {
    throw createError({ statusCode: 422, statusMessage: '只支持 .docx 格式的 Word 文件，换个文件试试？' })
  }

  const fileSize = uploadFile.data.length
  if (fileSize > 20 * 1024 * 1024) throw createError({ statusCode: 422, statusMessage: '文件不能超过 20MB' })

  const buffer = Buffer.from(uploadFile.data)
  const mammoth = await import('mammoth')
  const convertResult = await mammoth.convertToHtml({ buffer })

  if (!convertResult.value) {
    throw createError({ statusCode: 400, statusMessage: 'Word 文件解析失败，检查一下文件是不是损坏了' })
  }

  // 如果有 mammoth 警告，可以通过 convertResult.messages 获取，但不影响主流程
  const content = convertResult.value
  const placeholders = extractPlaceholders(content)
  const suggestedName = fileName.replace(/\.docx$/i, '')

  return {
    code: 0,
    data: {
      content,
      placeholders,
      suggestedName,
    },
    message: 'Word 模板解析完成！',
  }
})
