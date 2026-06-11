import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { codeRules } from '#schema/system'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  prefix: z.string().optional(),
  datePart: z.enum(['none', 'year', 'year_month', 'year_month_day']).optional(),
  seqLength: z.string().optional(),
  separator: z.string().optional(),
  currentSeq: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const { module } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: codeRules.id }).from(codeRules).where(eq(codeRules.module, module)).limit(1)

  if (existing.length > 0) {
    await db.update(codeRules).set(parsed.data).where(eq(codeRules.id, existing[0].id))
  } else {
    await db.insert(codeRules).values({
      id: generateId(),
      module,
      prefix: parsed.data.prefix || '',
      datePart: parsed.data.datePart || 'year_month',
      seqLength: parsed.data.seqLength || '4',
      separator: parsed.data.separator || '-',
      currentSeq: parsed.data.currentSeq || '0',
    })
  }

  const updated = await db.select().from(codeRules).where(eq(codeRules.module, module)).limit(1)
  return { code: 0, data: updated[0], message: '编码规则已保存' }
})
