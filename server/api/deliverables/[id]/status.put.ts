import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ status: z.enum(['submitted', 'accepted', 'rejected']) })

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '状态不对' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'accepted') updateData.acceptedAt = now

  await db.update(deliverables).set(updateData).where(eq(deliverables.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'deliverable', targetId: id, detail: '更新了交付物状态' })
  return { code: 0, data: null, message: '状态已更新' }
})
