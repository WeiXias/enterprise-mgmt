import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const schema = z.object({
  enumType: z.string().min(1),
  value: z.string().min(1),
  label: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { enumType: enumType, value, label } = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 读取现有覆盖数据
  const rows = await db.select().from(systemConfig).where(eq(systemConfig.key, 'dict_overrides'))
  const overrides: Record<string, Record<string, string>> = rows.length > 0 ? JSON.parse(rows[0]!.value || '{}') : {}

  // 更新覆盖
  if (!overrides[enumType]) overrides[enumType] = {}
  overrides[enumType][value] = label

  const newValue = JSON.stringify(overrides)

  if (rows.length > 0) {
    await db.update(systemConfig).set({ value: newValue, updatedAt: now }).where(eq(systemConfig.key, 'dict_overrides'))
  } else {
    await db.insert(systemConfig).values({ id: generateId(), key: 'dict_overrides', value: newValue, updatedAt: now })
  }

  return { code: 0, data: { enumType, value, label }, message: '数据字典已更新' }
})
