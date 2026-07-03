import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { projectTemplates, projects, tasks, projectMembers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string().optional().or(z.literal('')),
  contractId: z.string().optional(),
})

interface TemplatePhase {
  name: string
  tasks: { name: string; priority?: string; estimatedDays?: number }[]
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: templateId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 查找模板
  const templateRows = await db.select().from(projectTemplates)
    .where(and(eq(projectTemplates.id, templateId), isNull(projectTemplates.deletedAt)))
    .limit(1)
  if (templateRows.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })

  const template = templateRows[0]
  let phases: TemplatePhase[] = []
  try {
    phases = template!.phases ? JSON.parse(template.phases) : []
  } catch {
    throw createError({ statusCode: 500, statusMessage: '模板阶段数据解析失败' })
  }
  if (!Array.isArray(phases) || phases.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '模板未配置阶段和任务' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const projectId = generateId()

  await db.transaction(async (tx) => {
    // 1. 创建项目
    await tx.insert(projects).values({
      id: projectId,
      name: parsed.data.name,
      contractId: parsed.data.contractId || null,
      ownerUserId: user.userId,
      startDate: parsed.data.startDate || null,
      status: 'not_started',
      budget: 0,
      createdAt: now,
      updatedAt: now,
    })

    // 2. 遍历阶段创建任务
    let sortOrder = 0
    for (const phase of phases) {
      for (const t of phase.tasks || []) {
        const taskId = generateId()
        await tx.insert(tasks).values({
          id: taskId,
          projectId,
          name: `${phase.name} - ${t.name}`,
          priority: (['low', 'medium', 'high'].includes(t.priority || '') ? t.priority : 'medium') as 'low' | 'medium' | 'high',
          status: 'todo',
          progress: 0,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        sortOrder++
      }
    }

    // 3. 当前用户添加为项目负责人
    await tx.insert(projectMembers).values({
      id: generateId(),
      projectId,
      userId: user.userId,
      role: 'leader',
    })
  })

  await logOperation(event, {
    action: 'CREATE',
    module: 'project',
    targetId: projectId,
    detail: `通过模板「${template!.name}」创建了项目「${parsed.data.name}」`,
  })

  return { code: 0, data: { id: projectId }, message: '搞定了！项目已从模板创建' }
})
