import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional(),
  estimatedDays: z.number().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'project:edit')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return { code: 1, message: parsed.error.issues[0].message }
  await db.update(tasks).set(parsed.data as any).where(eq(tasks.id, id))
  return { code: 0, data: null, message: '已保存' }
})
