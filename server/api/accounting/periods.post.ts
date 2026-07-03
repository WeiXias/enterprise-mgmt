import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { accountingPeriods } from '#schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { year, month } = parsed.data
  const existing = await db.select({ id: accountingPeriods.id })
    .from(accountingPeriods).where(and(eq(accountingPeriods.year, year), eq(accountingPeriods.month, month))).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '该期间已存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const id = generateId()
  await db.insert(accountingPeriods).values({
    id, year, month, startDate, endDate, createdAt: now,
  } as any)

  return { code: 0, data: { id }, message: '会计期间已创建' }
})
