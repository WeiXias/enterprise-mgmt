import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { contracts } from './contracts'
import { products } from './products'

export const commissionRules = sqliteTable('commission_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseType: text('base_type', { enum: ['contract_amount', 'payment_amount'] }).notNull().default('payment_amount'),
  productId: text('product_id').references(() => products.id),
  minAmount: real('min_amount').notNull().default(0),
  maxAmount: real('max_amount'),
  rate: real('rate').notNull().default(0),
  isActive: text('is_active', { enum: ['yes', 'no'] }).notNull().default('yes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const commissions = sqliteTable('commissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  paymentId: text('payment_id'),
  ruleId: text('rule_id').references(() => commissionRules.id),
  baseAmount: real('base_amount').notNull().default(0),
  rate: real('rate').notNull().default(0),
  amount: real('amount').notNull().default(0),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'paid'] }).notNull().default('pending'),
  adjustAmount: real('adjust_amount').default(0),
  adjustReason: text('adjust_reason'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  periodMonth: text('period_month').notNull(),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const commissionPayouts = sqliteTable('commission_payouts', {
  id: text('id').primaryKey(),
  periodMonth: text('period_month').notNull(),
  totalAmount: real('total_amount').notNull().default(0),
  status: text('status', { enum: ['draft', 'confirmed', 'paid'] }).notNull().default('draft'),
  paidAt: text('paid_at'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const commissionPayoutItems = sqliteTable('commission_payout_items', {
  id: text('id').primaryKey(),
  payoutId: text('payout_id').notNull().references(() => commissionPayouts.id),
  commissionId: text('commission_id').notNull().references(() => commissions.id),
  userId: text('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull().default(0)
})
