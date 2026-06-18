import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  sort: z.string().optional().default('0'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { name, type, sort } = parsed.data
  const dictType = type === 'income' ? 'finance_income_category' : 'finance_expense_category'
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const entryId = generateId()
  await db.insert(dictEntries).values({
    id: entryId,
    dict_type: dictType,
    value: name,
    label: name,
    sort,
    is_active: '1',
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'finance', targetId: entryId, detail: '创建了财务分类' })
  return { code: 0, message: '分类已创建' }
})
