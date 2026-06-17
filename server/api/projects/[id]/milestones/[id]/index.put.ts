import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  await db.update(milestones).set(body as any).where(eq(milestones.id, id))
  return { code: 0, data: null, message: '已保存' }
})
