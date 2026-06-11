/**
 * 邮件发送工具
 * 使用 nodemailer + SMTP
 *
 * 配置环境变量：
 *   SMTP_HOST=xxx
 *   SMTP_PORT=587
 *   SMTP_USER=xxx
 *   SMTP_PASS=xxx
 *   SMTP_FROM=noreply@company.com
 */

import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST || 'smtp.example.com'
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''

  transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  return transporter
}

export async function sendEmail(options: {
  to: string
  subject: string
  html?: string
  text?: string
  attachments?: { filename: string; path: string }[]
}): Promise<boolean> {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'noreply@company.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    })
    return true
  } catch (err) {
    return false
  }
}
