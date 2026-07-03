import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { accounts } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
  categoryType: z.enum(['asset', 'liability', 'equity', 'cost', 'revenue_expense']),
  balanceDirection: z.enum(['debit', 'credit']),
  level: z.number().int().min(1).max(3).default(1),
  sort: z.number().int().default(0),
  remark: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { code, name, parentId, categoryType, balanceDirection, level, sort, remark } = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 检查编码唯一性
  const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, code)).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: `科目编码 ${code} 已存在` })

  const id = generateId()
  await db.insert(accounts).values({
    id,
    code,
    name,
    parentId: parentId || null,
    categoryType,
    balanceDirection,
    level,
    sort,
    isSystem: 0,
    remark: remark || null,
    createdAt: now,
    updatedAt: now,
  } as any)

  await logOperation(event, { action: 'CREATE', module: 'accounting', targetId: id, detail: `创建科目 ${code} ${name}` })
  return { code: 0, data: { id }, message: '科目已添加' }
})
