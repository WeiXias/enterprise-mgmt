import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { contracts } from './contracts'
import { projects } from './projects'

// 收支流水表
export const financeTransactions = sqliteTable('finance_transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull().default(0),
  category: text('category').notNull(),
  sourceType: text('source_type', { enum: ['contract_payment', 'commission_payout', 'reimbursement', 'manual'] }).notNull().default('manual'),
  sourceId: text('source_id'),
  contractId: text('contract_id').references(() => contracts.id),
  projectId: text('project_id').references(() => projects.id),
  transactionDate: text('transaction_date').notNull(),
  description: text('description'),
  paymentMethod: text('payment_method', { enum: ['bank_transfer', 'check', 'cash', 'alipay', 'wechat_pay', 'other'] }),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// 报销表
export const reimbursements = sqliteTable('reimbursements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  amount: integer('amount').notNull().default(0),
  reason: text('reason').notNull(),
  receiptUrls: text('receipt_urls'),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'paid'] }).notNull().default('pending'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  rejectedReason: text('rejected_reason'),
  projectId: text('project_id').references(() => projects.id),
  paidAt: text('paid_at'),
  paidTransactionId: text('paid_transaction_id'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// 财务配置表
export const financeSettings = sqliteTable('finance_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  remark: text('remark'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// 收支分类表
export const financeCategories = sqliteTable('finance_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// 预算表
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  month: integer('month'),
  type: text('type', { enum: ['income', 'expense'] }).notNull().default('expense'),
  category: text('category').notNull(),
  amount: integer('amount').notNull().default(0),
  projectId: text('project_id').references(() => projects.id),
  departmentId: text('department_id'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
