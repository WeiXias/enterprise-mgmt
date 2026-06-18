import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contractTemplates, contracts, customers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const schema = z.object({
  contractId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const tmplResult = await db.select().from(contractTemplates)
    .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt)))
    .limit(1)
  if (tmplResult.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })

  const tmpl = tmplResult[0]

  const contractResult = await db.select().from(contracts)
    .where(and(eq(contracts.id, parsed.data.contractId), isNull(contracts.deletedAt)))
    .limit(1)
  if (contractResult.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = contractResult[0]

  let customerName = ''
  const customerResult = await db.select({ name: customers.name }).from(customers)
    .where(eq(customers.id, c!.customerId)).limit(1)
  if (customerResult.length > 0) customerName = customerResult[0].name

  const replacements: Record<string, string> = {
    partyA: c!.partyA || '',
    partyB: c!.partyB || '',
    customerName,
    totalAmount: c!.totalAmount ? `¥${c.totalAmount.toLocaleString('zh-CN')}` : '',
    startDate: c!.startDate || '',
    endDate: c!.endDate || '',
    paymentMethod: c!.paymentMethod || '',
  }

  // 1. 渲染 HTML（详情页用）
  let htmlContent = tmpl!.content || ''
  for (const [key, value] of Object.entries(replacements)) {
    htmlContent = htmlContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`)
  }

  // 2. 如果有 docx 原始文件，用 docxtemplater 渲染 DOCX buffer（编辑器用）
  let docxBuffer: string | null = null
  if (tmpl!.docxContent) {
    try {
      const zip = new PizZip(Buffer.from(tmpl!.docxContent, 'base64'))
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      })
      doc.render(replacements)
      const rendered = doc.getZip().generate({ type: 'nodebuffer' })
      docxBuffer = Buffer.from(rendered).toString('base64')
    } catch {
      // docxtemplater 渲染失败时回退到只有 HTML
      docxBuffer = null
    }
  }

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: parsed.data.contractId, detail: `应用了模板「${tmpl!.name}」` })

  return {
    code: 0,
    data: {
      content: htmlContent,      // HTML — 详情页渲染
      docxBuffer,                 // base64 DOCX — 编辑器 loadDocumentBuffer
    },
    message: '模板已应用',
  }
})
