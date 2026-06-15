import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { productSpecs } from '#schema/products'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { z } from 'zod'

const schema = z.object({
  specs: z.array(z.object({
    specTemplate: z.string().min(1),
    specKey: z.string().min(1),
    specValue: z.string().min(1),
  })),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: productId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 先删旧再插新
  await db.delete(productSpecs).where(eq(productSpecs.productId, productId))

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  for (let i = 0; i < parsed.data.specs.length; i++) {
    const s = parsed.data.specs[i]
    await db.insert(productSpecs).values({
      id: generateId(),
      productId,
      specTemplate: s.specTemplate,
      specKey: s.specKey,
      specValue: s.specValue,
      sort: i,
      createdAt: now,
      updatedAt: now,
    })
  }

  return { code: 0, message: '规格已保存' }
})
