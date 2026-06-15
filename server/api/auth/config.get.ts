/**
 * 认证配置接口（公开）
 * GET /api/auth/config
 * 返回登录页面需要的系统配置，无需登录
 */
import { defineEventHandler } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const rows = await db.select({ key: systemConfig.key, value: systemConfig.value })
    .from(systemConfig)
    .where(eq(systemConfig.key, 'allow_register'))
    .limit(1)

  const allowRegister = rows[0]?.value === '1' || rows[0]?.value === 'true'

  return {
    code: 0,
    data: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || '企业一体化管理系统',
      allowRegister,
      siteName: process.env.NUXT_PUBLIC_APP_NAME || '企业一体化管理系统',
    }
  }
})
