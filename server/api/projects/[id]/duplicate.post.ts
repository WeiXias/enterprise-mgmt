import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { projects, projectMembers, tasks, milestones } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const bodySchema = z.object({ name: z.string().min(1).max(200).optional() }).default({})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '名称格式不对' })
  const newName = parsed.data.name || '副本'

  const [source] = await db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)))
  if (!source) throw createError({ statusCode: 404, statusMessage: '项目不存在' })

  const projectId = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // Create new project
  await db.insert(projects).values({
    id: projectId, name: newName,
    contractId: source.contractId,
    ownerUserId: source.ownerUserId || user.userId,
    startDate: source.startDate, endDate: source.endDate,
    budget: source.budget,
    status: 'not_started',
    remark: source.remark,
    createdAt: now, updatedAt: now,
  })

  // Copy members
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, id))
  for (const m of members) {
    await db.insert(projectMembers).values({
      id: generateId(), projectId,
      userId: m.userId, role: m.role,
    })
  }

  // Copy tasks (non-completed)
  const taskList = await db.select().from(tasks).where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)))
  const idMap = new Map<string, string>()
  for (const t of taskList) {
    const newId = generateId()
    idMap.set(t.id, newId)
    await db.insert(tasks).values({
      id: newId, projectId,
      name: t.name, description: t.description,
      assigneeId: t.assigneeId,
      priority: t.priority,
      status: 'todo', progress: 0,
      startDate: t.startDate, endDate: t.endDate,
      parentId: t.parentId ? null : null, // Will remap below
      sortOrder: t.sortOrder,
      remark: t.remark,
      createdAt: now, updatedAt: now,
    })
  }
  // Remap parent IDs
  for (const t of taskList) {
    if (t.parentId && idMap.has(t.parentId)) {
      const newId = idMap.get(t.id)!
      const newParentId = idMap.get(t.parentId)!
      await db.update(tasks).set({ parentId: newParentId }).where(eq(tasks.id, newId))
    }
  }

  // Copy milestones
  const mlList = await db.select().from(milestones).where(and(eq(milestones.projectId, id), isNull(milestones.deletedAt)))
  for (const ml of mlList) {
    await db.insert(milestones).values({
      id: generateId(), projectId,
      name: ml.name, description: ml.description,
      targetDate: ml.targetDate,
      sortOrder: ml.sortOrder,
      createdAt: now, updatedAt: now,
    })
  }

  await logOperation(event, { action: 'CREATE', module: 'project', targetId: projectId, detail: `复制自项目 ${source.name}` })
  return { code: 0, data: { id: projectId } }
})
