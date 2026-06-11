/**
 * PDF 生成工具
 * 用 puppeteer 渲染 HTML → PDF
 */

import puppeteer from 'puppeteer'

export async function generatePdf(html: string, filePath: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.pdf({
    path: filePath,
    format: 'A4',
    margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
    printBackground: true,
  })
  await browser.close()
  return filePath
}
