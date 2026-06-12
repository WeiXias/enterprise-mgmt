import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { todos, todoSubtasks, todoTagRelations, todoTags } from '#schema/todos'
import { eq, and, isNull, like, count, desc, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 100)
  const keyword = query.keyword as string | undefined
  const listId = query.listId as string | undefined
  const status = query.status as string | undefined
  const priority = query.priority as string | undefined

  const where: any[] = [eq(todos.userId, user.userId), isNull(todos.deletedAt)]
  if (keyword) where.push(like(todos.title, `%${keyword}%`))
  if (listId) where.push(eq(todos.listId, listId))
  if (status) where.push(eq(todos.status, status))
  if (priority) where.push(eq(todos.priority, priority))

  const [list, totalResult] = await Promise.all([
    db.select().from(todos)
      .where(and(...where))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(todos.sortOrder, desc(todos.createdAt)),
    db.select({ count: count() }).from(todos).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)

  // 批量获取子任务
  const todoIds = list.map(t => t.id)
  let allSubtasks: any[] = []
  let allTagRelations: any[] = []
  let allTags: any[] = []

  if (todoIds.length > 0) {
    const [subtaskResult, tagRelResult] = await Promise.all([
      db.select().from(todoSubtasks)
        .where(and(inArray(todoSubtasks.todoId, todoIds), isNull(todoSubtasks.deletedAt)))
        .orderBy(todoSubtasks.sortOrder),
      db.select().from(todoTagRelations)
        .where(inArray(todoTagRelations.todoId, todoIds)),
    ])
    allSubtasks = subtaskResult
    allTagRelations = tagRelResult

    // 获取关联的标签信息
    const tagIds = [...new Set(allTagRelations.map(r => r.tagId))]
    if (tagIds.length > 0) {
      allTags = await db.select().from(todoTags)
        .where(inArray(todoTags.id, tagIds))
    }
  }

  // 构建 map
  const subtaskMap: Record<string, any[]> = {}
  allSubtasks.forEach(s => {
    if (!subtaskMap[s.todoId]) subtaskMap[s.todoId] = []
    subtaskMap[s.todoId].push(s)
  })

  const tagMap: Record<string, any> = {}
  allTags.forEach(t => { tagMap[t.id] = t })

  const todoTagMap: Record<string, any[]> = {}
  allTagRelations.forEach(r => {
    if (!todoTagMap[r.todoId]) todoTagMap[r.todoId] = []
    const tag = tagMap[r.tagId]
    if (tag) todoTagMap[r.todoId].push(tag)
  })

  return {
    code: 0,
    data: {
      items: list.map(t => ({
        ...t,
        subtasks: subtaskMap[t.id] || [],
        tags: todoTagMap[t.id] || [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})