import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { topologicalSort } from '#server-utils/task-deps'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  await requirePermission(event, 'task:view')

  const list = await db.select({
    id: tasks.id,
    name: tasks.name,
    parentId: tasks.parentId,
    status: tasks.status,
  }).from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))

  const { sorted, cycles } = topologicalSort(list)

  return {
    code: 0,
    data: {
      tasks: list,
      sortedOrder: sorted,
      cycleWarnings: cycles.length > 0 ? cycles : undefined,
    },
  }
})
