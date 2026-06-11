import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { contracts } from './contracts'
import { users } from './users'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contractId: text('contract_id').references(() => contracts.id),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  startDate: text('start_date'),
  endDate: text('end_date'),
  budget: real('budget').notNull().default(0),
  status: text('status', { enum: ['not_started', 'in_progress', 'completed', 'delayed'] }).notNull().default('not_started'),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

export const projectMembers = sqliteTable('project_members', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role', { enum: ['leader', 'member'] }).notNull().default('member')
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  assigneeId: text('assignee_id').references(() => users.id),
  parentId: text('parent_id'), // 前置任务（自引用）
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  status: text('status', { enum: ['todo', 'in_progress', 'completed'] }).notNull().default('todo'),
  progress: integer('progress').notNull().default(0),
  startDate: text('start_date'),
  endDate: text('end_date'),
  completedAt: text('completed_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

export const deliverables = sqliteTable('deliverables', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  filePath: text('file_path'),
  status: text('status', { enum: ['pending', 'submitted', 'accepted', 'rejected'] }).notNull().default('pending'),
  acceptedAt: text('accepted_at'),
  acceptedBy: text('accepted_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 里程碑
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  targetDate: text('target_date').notNull(),
  completedAt: text('completed_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

// 评论（项目级 + 任务级）
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  targetType: text('target_type', { enum: ['project', 'task'] }).notNull(),
  targetId: text('target_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  parentId: text('parent_id'), // 楼中楼回复
  mentions: text('mentions'), // JSON array of userIds
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

// 项目模板
export const projectTemplates = sqliteTable('project_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', { enum: ['it_implementation', 'om_service', 'consulting', 'other'] }).notNull(),
  phases: text('phases'), // JSON: [{name, tasks: [{name, priority, estimatedDays}]}]
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

// 工时记录
export const timeLogs = sqliteTable('time_logs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  taskId: text('task_id').references(() => tasks.id),
  userId: text('user_id').notNull().references(() => users.id),
  date: text('date').notNull(),
  hours: real('hours').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'rejected'] }).notNull().default('draft'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

// 风险/问题登记
export const risks = sqliteTable('risks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['risk', 'issue'] }).notNull().default('risk'),
  impact: text('impact', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  probability: text('probability', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  status: text('status', { enum: ['identified', 'mitigating', 'resolved', 'closed'] }).notNull().default('identified'),
  mitigation: text('mitigation'),
  assignedTo: text('assigned_to').references(() => users.id),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})
