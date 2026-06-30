import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts, products } from '#schema'
import { eq } from 'drizzle-orm'
import { generatePdf } from '#server-utils/pdf'
import { getUploadDir } from '#server-utils/upload'
import path from 'path'
import fs from 'fs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'opportunity:view')

  const qData = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
  if (!qData.length) throw createError({ statusCode: 404, statusMessage: '报价不存在' })

  const items = await db.select({
    productName: products.name,
    quantity: quoteProducts.quantity,
    unitPrice: quoteProducts.unitPrice,
    discount: quoteProducts.discount,
  }).from(quoteProducts)
    .leftJoin(products, eq(quoteProducts.productId, products.id))
    .where(eq(quoteProducts.quoteId, id))

  const q = qData[0]
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const uploadDir = await getUploadDir()
  const fileDir = path.join(uploadDir, 'quotes')
  if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true })
  const filePath = path.join(fileDir, `${id}.pdf`)

  const itemsHtml = items.map((it: { productName: string | null; quantity: number; unitPrice: number; discount: number }) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${it.productName || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${it.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">¥${(it.unitPrice || 0).toLocaleString()}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${((it.discount ?? 100))}%</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">¥${((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString()}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,'PingFang SC',sans-serif;color:#333;padding:20px}</style></head><body>
    <h1 style="font-size:20px;margin-bottom:4px">${q!.name || '报价单'}</h1>
    <p style="color:#888;font-size:12px;margin-bottom:16px">生成时间：${timestamp}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      <thead><tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">产品</th><th style="padding:8px;border:1px solid #ddd;text-align:right">数量</th><th style="padding:8px;border:1px solid #ddd;text-align:right">单价</th><th style="padding:8px;border:1px solid #ddd;text-align:right">折扣</th><th style="padding:8px;border:1px solid #ddd;text-align:right">小计</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="text-align:right;font-size:14px;font-weight:bold">合计：¥${q!.totalAmount?.toLocaleString() || '0'}</p>
  </body></html>`

  await generatePdf(html, filePath)

  const pdfUrl = `/uploads/quotes/${id}.pdf`
  await db.update(quotes).set({ pdfPath: pdfUrl, updatedAt: new Date().toISOString() }).where(eq(quotes.id, id))

  return { code: 0, data: { pdfUrl }, message: 'PDF 已生成' }
})
