import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const itemSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1),
  label: z.string().min(1),
  sort: z.number().optional(),
  isActive: z.boolean().optional(),
})

const bodySchema = z.object({
  items: z.array(itemSchema),
  removedIds: z.array(z.string()).optional().default([]),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')
  const { type } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { items, removedIds } = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 删除
  if (removedIds.length > 0) {
    for (const id of removedIds) {
      await db.delete(dictEntries).where(eq(dictEntries.id, id))
    }
  }

  // 插入或更新
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const sort = item.sort ?? i
    const isActive = item.isActive !== false ? '1' : '0'

    if (item.id) {
      // 更新
      await db.update(dictEntries).set({
        value: item.value,
        label: item.label,
        sort: String(sort),
        is_active: isActive,
        updatedAt: now,
      }).where(eq(dictEntries.id, item.id))
    } else {
      // 新增 — 先检查重复
      const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
        .where(and(eq(dictEntries.dict_type, type), eq(dictEntries.value, item.value)))
        .limit(1)
      if (existing.length > 0) continue

      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: type,
        value: item.value,
        label: item.label,
        sort: String(sort),
        is_active: isActive,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return { code: 0, message: '字典已更新' }
})
