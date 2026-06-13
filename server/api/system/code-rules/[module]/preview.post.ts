import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { codeRules } from '#schema/system'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { module } = getRouterParams(event)
  // 简化版：预览下一个编号
  const existing = await db.select().from(codeRules)
    .where(and(eq(codeRules.module, module), isNull(codeRules.deletedAt))).limit(1)
  const rule = existing[0]
  if (!rule) return { code: 0, data: { preview: `${module!.toUpperCase()}-001` } }
  const prefix = rule.prefix || module!.toUpperCase()
  const digits = rule.digits || 3
  const separator = rule.separator || '-'
  const next = (Date.now().toString().slice(-3)).padStart(digits, '0')
  const preview = `${prefix}${separator}${next}`
  return { code: 0, data: { preview } }
})