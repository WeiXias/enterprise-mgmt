import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  avatar: text('avatar'),
  role: text('role', { enum: ['admin', 'sales_manager', 'sales_member', 'finance'] }).notNull().default('sales_member'),
  roleId: text('role_id'),
  departmentId: text('department_id'),
  status: text('status', { enum: ['active', 'disabled', 'pending'] }).notNull().default('active'),
  tokenVersion: integer('token_version').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

// 部门表（自引用树形结构）
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  managerId: text('manager_id'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 角色表
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 权限表
export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 角色-权限关联表
export const rolePermissions = sqliteTable('role_permissions', {
  roleId: text('role_id').notNull(),
  permissionId: text('permission_id').notNull()
})

export const operationLogs = sqliteTable('operation_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  module: text('module').notNull(),
  action: text('action').notNull(),
  targetId: text('target_id'),
  detail: text('detail'),
  ip: text('ip'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type', { enum: ['system', 'remind', 'approval', 'commission'] }).notNull().default('system'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  relatedId: text('related_id'),
  relatedType: text('related_type'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})
