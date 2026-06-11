import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts, products } from '#schema'
import { eq } from 'drizzle-orm'
import { generatePdf } from '#server-utils/pdf'
import { sendEmail } from '#server-utils/email'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const bodySchema = z.object({
  to: z.string().email('请输入正确的邮箱'),
  subject: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { to, subject } = parsed.data

  // 1. 获取报价数据
  const qData = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
  if (!qData.length) throw createError({ statusCode: 404, statusMessage: '报价不存在' })

  const items = await db.select({
    productName: products.name,
    quantity: quoteProducts.quantity,
    unitPrice: quoteProducts.unitPrice,
    discount: quoteProducts.discount,
  }).from(quoteProducts).leftJoin(products, eq(quoteProducts.productId, products.id)).where(eq(quoteProducts.quoteId, id))

  const q = qData[0]
  const timestamp = new Date().toLocaleString('zh-CN')

  // 2. 生成 PDF
  const uploadDir = await getUploadDir()
  const fileDir = path.join(uploadDir, 'quotes')
  if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true })
  const pdfPath = path.join(fileDir, `${id}.pdf`)

  const itemsHtml = items.map((it: { productName: string | null; quantity: number; unitPrice: number; discount: number }) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${it.productName || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">¥${(it.unitPrice || 0).toLocaleString()}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${((it.discount ?? 100))}%</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">¥${((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString()}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;padding:20px}</style></head><body>
    <h1 style="font-size:20px;margin-bottom:4px">${q.name || '报价单'}</h1>
    <p style="color:#888;font-size:12px;margin-bottom:16px">生成时间：${timestamp}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      <thead><tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">产品</th><th style="padding:8px;border:1px solid #ddd;text-align:right">数量</th><th style="padding:8px;border:1px solid #ddd;text-align:right">单价</th><th style="padding:8px;border:1px solid #ddd;text-align:right">折扣</th><th style="padding:8px;border:1px solid #ddd;text-align:right">小计</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="text-align:right;font-size:14px;font-weight:bold;color:#d97706">合计：¥${q.totalAmount?.toLocaleString() || '0'}</p>
    <div style="margin-top:30px;font-size:12px;color:#888">
      <p>有效期至：${q.validUntil || '-'}</p>
    </div>
  </body></html>`

  await generatePdf(html, pdfPath)

  const pdfUrl = `/uploads/quotes/${id}.pdf`

  // 3. 发送邮件
  const emailSubject = subject || `报价单：${q.name || '报价函'}`
  const emailSent = await sendEmail({
    to,
    subject: emailSubject,
    html: `<p>您好，</p><p>请查收附件中的报价单。如有疑问请随时联系我们。</p><p style="color:#888;font-size:12px">报价单名称：${q.name || '报价函'}<br/>生成时间：${timestamp}</p>`,
    attachments: [{ filename: path.basename(pdfPath), path: pdfPath }],
  })

  // 4. 更新状态
  await db.update(quotes).set({ status: 'sent', pdfPath: pdfUrl, updatedAt: new Date().toISOString() }).where(eq(quotes.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'quote', targetId: id, detail: `发送了报价` })

  return {
    code: 0,
    data: { pdfUrl, emailSent },
    message: emailSent ? '报价已发送' : 'PDF 已生成，但邮件发送失败',
  }
})
