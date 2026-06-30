import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, customers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generatePdf } from '#server-utils/pdf'
import { getUploadDir } from '#server-utils/upload'
import fs from 'fs'
import path from 'path'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const result = await db.select().from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
    .limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const c = result[0]

  let customerName = ''
  const customerResult = await db.select({ name: customers.name }).from(customers)
    .where(eq(customers.id, c!.customerId)).limit(1)
  if (customerResult.length > 0) customerName = customerResult[0].name

  // 优先用前端传来的 HTML，否则用数据库内容（兼容旧数据）
  const body = await readBody(event)
  const contentHTML: string = body?.contentHTML || c!.content || ''

  const uploadDir = await getUploadDir()
  const pdfDir = path.join(uploadDir, 'contracts')
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

  const pdfFileName = `${id}.pdf`
  const pdfFilePath = path.join(pdfDir, pdfFileName)

  const totalAmount = c!.totalAmount ? `¥${Number(c.totalAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #333; line-height: 1.8; padding: 40px; }
  h1 { text-align: center; font-size: 22px; letter-spacing: 4px; margin-bottom: 30px; color: #1a1a1a; }
  .meta-box { background: #f9f8f5; border: 1px solid #e5e3dd; border-radius: 6px; padding: 16px 20px; margin-bottom: 30px; font-size: 12px; }
  .meta-box table { width: 100%; border-collapse: collapse; }
  .meta-box td { padding: 4px 0; }
  .meta-box .label { color: #888; white-space: nowrap; padding-right: 8px; }
  .meta-box .value { color: #333; }
  .content-area { margin: 20px 0; }
  .sign-area { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
  .sign-box { width: 45%; }
  .sign-box p { margin: 8px 0; }
</style>
</head>
<body>
<h1>合 同 书</h1>

<div class="meta-box">
<table>
<tr>
  <td class="label">合同编号：</td><td class="value">${c!.code || '-'}</td>
  <td class="label">客户：</td><td class="value">${customerName || '-'}</td>
</tr>
<tr>
  <td class="label">甲方：</td><td class="value">${c!.partyA || '-'}</td>
  <td class="label">乙方：</td><td class="value">${c!.partyB || '-'}</td>
</tr>
<tr>
  <td class="label">合同金额：</td><td class="value">${totalAmount}</td>
  <td class="label">签约日期：</td><td class="value">${c!.startDate || '-'}</td>
</tr>
</table>
</div>

<div class="content-area">
${contentHTML || '<p style="color:#999;text-align:center;">（合同正文待起草）</p>'}
</div>

<div class="sign-area">
<div class="sign-box">
  <p><strong>甲方（盖章）：</strong></p>
  <p>授权代表：___________</p>
  <p>日期：____年____月____日</p>
</div>
<div class="sign-box">
  <p><strong>乙方（盖章）：</strong></p>
  <p>授权代表：___________</p>
  <p>日期：____年____月____日</p>
</div>
</div>
</body>
</html>`

  await generatePdf(html, pdfFilePath)

  const pdfUrl = `/uploads/contracts/${pdfFileName}`

  return { code: 0, data: { pdfUrl }, message: 'PDF 已生成' }
})
