import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNull, sql } from 'drizzle-orm'
import * as schema from '../../server/database/schema/index'
import { generateId } from '../../server/utils/id'
import { detectCycle, topologicalSort } from '../../server/utils/task-deps'
import { computeBurndown } from '../../server/utils/burndown'

type DB = ReturnType<typeof drizzle>

let db: DB
let sqlite: ReturnType<typeof Database>
let adminId: string
let memberId: string
let projectId: string

function createTables() {
  const ddl = [
    `create table if not exists users (id text primary key, username text not null unique, password text not null, name text not null, phone text, email text, avatar text, status text not null default 'active', role text not null default 'sales_member', role_id text, department_id text, token_version integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists projects (id text primary key, name text not null, contract_id text, owner_user_id text not null references users(id), start_date text, end_date text, budget integer not null default 0, status text not null default 'not_started', remark text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists project_members (id text primary key, project_id text not null references projects(id), user_id text not null references users(id), role text not null default 'member')`,
    `create table if not exists tasks (id text primary key, project_id text not null references projects(id), name text not null, description text, assignee_id text references users(id), parent_id text, priority text not null default 'medium', status text not null default 'todo', progress integer not null default 0, start_date text, end_date text, completed_at text, sort_order integer not null default 0, remark text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists milestones (id text primary key, project_id text not null references projects(id), name text not null, description text, target_date text not null, completed_at text, sort_order integer not null default 0, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists deliverables (id text primary key, project_id text not null references projects(id), name text not null, description text, file_path text, status text not null default 'pending', accepted_at text, accepted_by text references users(id), created_at text not null default (datetime('now')))`,
    `create table if not exists time_logs (id text primary key, project_id text not null references projects(id), task_id text references tasks(id), user_id text not null references users(id), date text not null, hours real not null, description text, status text not null default 'draft', approved_by text references users(id), approved_at text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists risks (id text primary key, project_id text not null references projects(id), title text not null, description text, type text not null default 'risk', impact text not null default 'medium', probability text not null default 'medium', status text not null default 'identified', mitigation text, assigned_to text references users(id), resolved_at text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
    `create table if not exists comments (id text primary key, target_type text not null, target_id text not null, user_id text not null references users(id), content text not null, parent_id text, mentions text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), deleted_at text)`,
  ]
  for (const s of ddl) sqlite.exec(s)
}

async function seed() {
  adminId = generateId()
  memberId = generateId()
  projectId = generateId()
  await db.insert(schema.users).values({ id: adminId, username: 'pm', password: 'hash', name: '项目经理', role: 'admin', status: 'active' })
  await db.insert(schema.users).values({ id: memberId, username: 'dev1', password: 'hash', name: '开发1', role: 'sales_member', status: 'active' })
  await db.insert(schema.projects).values({
    id: projectId, name: '测试项目', ownerUserId: adminId,
    startDate: '2026-06-01', endDate: '2026-12-31', budget: 500000, status: 'in_progress',
  })
  await db.insert(schema.projectMembers).values({ id: generateId(), projectId, userId: adminId, role: 'leader' })
  await db.insert(schema.projectMembers).values({ id: generateId(), projectId, userId: memberId, role: 'member' })
}

describe('项目全流程', () => {
  beforeAll(async () => {
    sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    createTables()
    await seed()
  })
  afterAll(() => sqlite.close())

  // ---- 项目基础 ----
  it('1. 创建项目', async () => {
    const id = generateId()
    await db.insert(schema.projects).values({
      id, name: '全新项目', ownerUserId: adminId,
      startDate: '2026-07-01', endDate: '2027-03-31', budget: 300000, status: 'not_started',
    })
    const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1)
    expect(row!.name).toBe('全新项目')
    expect(row!.budget).toBe(300000)
    expect(row!.status).toBe('not_started')
  })

  it('2. 项目成员管理：添加与角色', async () => {
    const members = await db.select().from(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId))
    expect(members.length).toBe(2)
    const leader = members.find(m => m.role === 'leader')
    expect(leader).toBeDefined()
    expect(leader!.userId).toBe(adminId)
  })

  // ---- 任务 ----
  it('3. 创建项目任务', async () => {
    const taskId = generateId()
    await db.insert(schema.tasks).values({
      id: taskId, projectId, name: '需求分析', assigneeId: memberId,
      priority: 'high', status: 'todo', progress: 0,
    })
    const [row] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).limit(1)
    expect(row!.name).toBe('需求分析')
    expect(row!.assigneeId).toBe(memberId)
    expect(row!.status).toBe('todo')
  })

  it('4. 任务状态流转：todo → in_progress → completed', async () => {
    const taskId = generateId()
    await db.insert(schema.tasks).values({
      id: taskId, projectId, name: '模块开发', assigneeId: memberId,
      priority: 'medium', status: 'todo',
    })
    // 开始
    await db.update(schema.tasks).set({ status: 'in_progress' }).where(eq(schema.tasks.id, taskId))
    const [ip] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).limit(1)
    expect(ip!.status).toBe('in_progress')

    // 完成
    const completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.update(schema.tasks).set({ status: 'completed', progress: 100, completedAt }).where(eq(schema.tasks.id, taskId))
    const [done] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).limit(1)
    expect(done!.status).toBe('completed')
    expect(done!.progress).toBe(100)
  })

  // ---- 任务依赖（dag） ----
  it('5. 任务依赖关系：无环检测', () => {
    const tasks = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]
    expect(detectCycle(tasks, 'd', 'c')).toBe(false) // d→c→b→a 无环
  })

  it('6. 任务依赖关系：环检测', () => {
    const tasks = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'c' },
      { id: 'c', parentId: 'a' },
    ]
    expect(detectCycle(tasks, 'a', 'c')).toBe(true) // c→a→b→c 成环
  })

  it('7. 拓扑排序：正常依赖链', () => {
    const tasks = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
    ]
    const { sorted, cycles } = topologicalSort(tasks)
    expect(cycles).toHaveLength(0)
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'))
    expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('c'))
    expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'))
  })

  it('8. 拓扑排序：检测到环', () => {
    const tasks = [
      { id: 'x', parentId: 'z' },
      { id: 'y', parentId: 'x' },
      { id: 'z', parentId: 'y' },
    ]
    const { sorted, cycles } = topologicalSort(tasks)
    expect(sorted).toHaveLength(0)
    expect(cycles.length).toBeGreaterThan(0)
  })

  // ---- 里程碑 ----
  it('9. 里程碑管理', async () => {
    const m1 = generateId()
    const m2 = generateId()
    await db.insert(schema.milestones).values({ id: m1, projectId, name: '需求确认', targetDate: '2026-07-01', sortOrder: 1 })
    await db.insert(schema.milestones).values({ id: m2, projectId, name: '产品上线', targetDate: '2026-12-01', sortOrder: 2 })
    const all = await db.select().from(schema.milestones)
      .where(and(eq(schema.milestones.projectId, projectId), isNull(schema.milestones.deletedAt)))
    expect(all).toHaveLength(2)
    // 完成里程碑
    await db.update(schema.milestones).set({ completedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(eq(schema.milestones.id, m1))
    const [done] = await db.select().from(schema.milestones).where(eq(schema.milestones.id, m1)).limit(1)
    expect(done!.completedAt).toBeTruthy()
  })

  // ---- 交付物 ----
  it('10. 交付物提交与验收', async () => {
    const dId = generateId()
    await db.insert(schema.deliverables).values({
      id: dId, projectId, name: '源代码交付', description: '完整的项目源码', status: 'pending',
    })
    // 提交
    await db.update(schema.deliverables).set({ status: 'submitted', filePath: '/files/code.zip' }).where(eq(schema.deliverables.id, dId))
    const [submitted] = await db.select().from(schema.deliverables).where(eq(schema.deliverables.id, dId)).limit(1)
    expect(submitted!.status).toBe('submitted')
    expect(submitted!.filePath).toBe('/files/code.zip')
    // 验收
    await db.update(schema.deliverables).set({ status: 'accepted', acceptedAt: new Date().toISOString().slice(0, 10), acceptedBy: adminId }).where(eq(schema.deliverables.id, dId))
    const [accepted] = await db.select().from(schema.deliverables).where(eq(schema.deliverables.id, dId)).limit(1)
    expect(accepted!.status).toBe('accepted')
    expect(accepted!.acceptedBy).toBe(adminId)
  })

  // ---- 工时 ----
  it('11. 工时记录', async () => {
    const taskId = generateId()
    await db.insert(schema.tasks).values({
      id: taskId, projectId, name: '工时测试任务', assigneeId: memberId,
      status: 'in_progress', priority: 'medium',
    })
    const t1 = generateId()
    const t2 = generateId()
    await db.insert(schema.timeLogs).values({ id: t1, projectId, taskId, userId: memberId, date: '2026-06-15', hours: 8, description: '后端开发' })
    await db.insert(schema.timeLogs).values({ id: t2, projectId, taskId, userId: memberId, date: '2026-06-16', hours: 6, description: '前端对接' })

    const logs = await db.select().from(schema.timeLogs)
      .where(and(eq(schema.timeLogs.taskId, taskId), isNull(schema.timeLogs.deletedAt)))
    expect(logs).toHaveLength(2)

    const totalHours = logs.reduce((sum, l) => sum + l.hours, 0)
    expect(totalHours).toBe(14)
  })

  it('12. 工时审批流：draft → submitted → approved', async () => {
    const logId = generateId()
    await db.insert(schema.timeLogs).values({
      id: logId, projectId, userId: memberId, date: '2026-06-17', hours: 4, description: '部署调试', status: 'draft',
    })
    // 提交
    await db.update(schema.timeLogs).set({ status: 'submitted' }).where(eq(schema.timeLogs.id, logId))
    // 审批
    await db.update(schema.timeLogs).set({ status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(eq(schema.timeLogs.id, logId))
    const [approved] = await db.select().from(schema.timeLogs).where(eq(schema.timeLogs.id, logId)).limit(1)
    expect(approved!.status).toBe('approved')
    expect(approved!.approvedBy).toBe(adminId)
  })

  // ---- 燃尽图 ----
  it('13. 燃尽图计算', () => {
    const tasks = [
      { status: 'completed', createdAt: '2026-06-01', completedAt: '2026-06-02' },
      { status: 'completed', createdAt: '2026-06-01', completedAt: '2026-06-04' },
      { status: 'in_progress', createdAt: '2026-06-01' },
      { status: 'todo', createdAt: '2026-06-03' },
    ]
    const { days, actual, ideal } = computeBurndown(tasks, '2026-06-01', '2026-06-05')
    expect(days.length).toBe(5)
    expect(ideal[0]).toBe(4)    // 起始 4 个任务
    expect(ideal[ideal.length - 1]).toBe(0) // 终点 0
    // actual[0]: task 1+2+3 在 6/1 已创建，task 3 in_progress=open, task1+2 completed但completedAt晚于day1=open, 共3个open. task 4 在 6/3 才创建，不计入
    expect(actual[0]).toBe(3)
    // 第 2 天完成 1 个
    // 第 4 天完成 1 个，但第 5 天还有 2 个未完成
    expect(actual[actual.length - 1]).toBe(2)
  })

  // ---- 风险 ----
  it('14. 风险登记与缓解', async () => {
    const riskId = generateId()
    await db.insert(schema.risks).values({
      id: riskId, projectId, title: '服务器供应紧张', type: 'risk', impact: 'high', probability: 'medium', status: 'identified',
    })
    // 缓解
    await db.update(schema.risks).set({ status: 'mitigating', mitigation: '提前订购备用服务器' }).where(eq(schema.risks.id, riskId))
    const [row] = await db.select().from(schema.risks).where(eq(schema.risks.id, riskId)).limit(1)
    expect(row!.status).toBe('mitigating')
    expect(row!.mitigation).toBeTruthy()
    // 关闭
    await db.update(schema.risks).set({ status: 'resolved', resolvedAt: '2026-07-01' }).where(eq(schema.risks.id, riskId))
    const [closed] = await db.select().from(schema.risks).where(eq(schema.risks.id, riskId)).limit(1)
    expect(closed!.status).toBe('resolved')
  })

  // ---- 评论 ----
  it('15. 项目/任务评论', async () => {
    const c1 = generateId()
    const c2 = generateId()
    await db.insert(schema.comments).values({ id: c1, targetType: 'project', targetId: projectId, userId: adminId, content: '项目进度正常' })
    await db.insert(schema.comments).values({ id: c2, targetType: 'task', targetId: generateId(), userId: memberId, content: '我需要更多时间' })

    const projectComments = await db.select().from(schema.comments)
      .where(and(eq(schema.comments.targetType, 'project'), eq(schema.comments.targetId, projectId)))
    expect(projectComments).toHaveLength(1)
    expect(projectComments[0]!.content).toBe('项目进度正常')
  })
})
