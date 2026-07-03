import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { contracts } from './contracts'
import { projects } from './projects'
import { customers } from './customers'
import { suppliers } from './suppliers'

// 会计科目表
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  parentId: text('parent_id').references(() => accounts.id),
  categoryType: text('category_type', { enum: ['asset', 'liability', 'equity', 'cost', 'revenue_expense'] }).notNull(),
  balanceDirection: text('balance_direction', { enum: ['debit', 'credit'] }).notNull(),
  level: integer('level').notNull().default(1),
  sort: integer('sort').notNull().default(0),
  isSystem: integer('is_system').notNull().default(0),
  isEnabled: integer('is_enabled').notNull().default(1),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// 会计期间表
export const accountingPeriods = sqliteTable('accounting_periods', {
  id: text('id').primaryKey(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isClosed: integer('is_closed').notNull().default(0),
  closedBy: text('closed_by').references(() => users.id),
  closedAt: text('closed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// 凭证表
export const vouchers = sqliteTable('vouchers', {
  id: text('id').primaryKey(),
  voucherNo: text('voucher_no').notNull(),
  voucherDate: text('voucher_date').notNull(),
  summary: text('summary'),
  status: text('status', { enum: ['draft', 'reviewed', 'approved', 'posted'] }).notNull().default('draft'),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  periodId: text('period_id').references(() => accountingPeriods.id),
  attachments: text('attachments'),
  preparedBy: text('prepared_by').notNull().references(() => users.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  approvedAt: text('approved_at'),
  postedAt: text('posted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// 分录表
export const voucherEntries = sqliteTable('voucher_entries', {
  id: text('id').primaryKey(),
  voucherId: text('voucher_id').notNull().references(() => vouchers.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  summary: text('summary'),
  debitAmount: integer('debit_amount').notNull().default(0),
  creditAmount: integer('credit_amount').notNull().default(0),
  contractId: text('contract_id').references(() => contracts.id),
  projectId: text('project_id').references(() => projects.id),
  customerId: text('customer_id').references(() => customers.id),
  supplierId: text('supplier_id').references(() => suppliers.id),
  sort: integer('sort').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// 科目余额表
export const accountBalances = sqliteTable('account_balances', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  periodId: text('period_id').notNull().references(() => accountingPeriods.id),
  openingDebit: integer('opening_debit').notNull().default(0),
  openingCredit: integer('opening_credit').notNull().default(0),
  periodDebit: integer('period_debit').notNull().default(0),
  periodCredit: integer('period_credit').notNull().default(0),
  closingDebit: integer('closing_debit').notNull().default(0),
  closingCredit: integer('closing_credit').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
