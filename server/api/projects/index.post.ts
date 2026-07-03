import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { projects, projectMembers } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200),
  contractId: z.string().optional(),
  budget: z.number().min(0).optional(),
  remark: z.string().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  members: z.array(z.object({ userId: z.string(), role: z.enum(['leader', 'member']) })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const projectId = generateId()

  await db.transaction(async (tx) => {
    await tx.insert(projects).values({
      id: projectId,
      name: parsed.data.name,
      contractId: parsed.data.contractId || null,
      ownerUserId: user.userId,
      budget: parsed.data.budget ?? 0,
      remark: parsed.data.remark || null,
      startDate: parsed.data.startDate || null,
      endDate: parsed.data.endDate || null,
      status: 'not_started',
      createdAt: now,
      updatedAt: now,
    })

    // 添加负责人为成员
    await tx.insert(projectMembers).values({
      id: generateId(),
      projectId,
      userId: user.userId,
      role: 'leader',
    })

    // 添加其他成员
    if (parsed.data.members?.length) {
      await tx.insert(projectMembers).values(
        parsed.data.members.map(m => ({
          id: generateId(),
          projectId,
          userId: m.userId,
          role: m.role,
        }))
      )
    }
  })

  await logOperation(event, { action: 'CREATE', module: 'project', targetId: projectId, detail: `创建了项目「${parsed.data.name}」` })

  return { code: 0, data: { id: projectId }, message: '搞定了！项目已创建' }
})
