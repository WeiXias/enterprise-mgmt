import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { customers } from './customers'
import { contracts } from './contracts'
import { projects } from './projects'
import { opportunities } from './opportunities'

// ---- 清单 ----
export const todoLists = sqliteTable('todo_lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color', { enum: ['amber', 'teal', 'blue', 'coral', 'stone', 'violet'] }).notNull().default('amber'),
  icon: text('icon').default('i-lucide-list-checks'),
  sortOrder: integer('sort_order').notNull().default(0),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// ---- 任务 (todo) ----
export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull().references(() => todoLists.id),
  title: text('title').notNull(),
  note: text('note'),
  priority: text('priority', { enum: ['urgent_important', 'urgent_not_important', 'important_not_urgent', 'not_urgent_not_important'] }).notNull().default('not_urgent_not_important'),
  status: text('status', { enum: ['todo', 'in_progress', 'completed'] }).notNull().default('todo'),
  dueDate: text('due_date'),
  remindAt: text('remind_at'),
  completedAt: text('completed_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  userId: text('user_id').notNull().references(() => users.id),
  // ---- 可选业务关联 ----
  customerId: text('customer_id').references(() => customers.id),
  contractId: text('contract_id').references(() => contracts.id),
  projectId: text('project_id').references(() => projects.id),
  opportunityId: text('opportunity_id').references(() => opportunities.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// ---- 子任务 ----
export const todoSubtasks = sqliteTable('todo_subtasks', {
  id: text('id').primaryKey(),
  todoId: text('todo_id').notNull().references(() => todos.id),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// ---- 标签 ----
export const todoTags = sqliteTable('todo_tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('amber'),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---- 任务-标签关联 ----
export const todoTagRelations = sqliteTable('todo_tag_relations', {
  todoId: text('todo_id').notNull().references(() => todos.id),
  tagId: text('tag_id').notNull().references(() => todoTags.id),
})