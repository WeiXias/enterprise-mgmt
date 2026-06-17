import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers'
import { contracts } from './contracts'
import { users } from './users'

export const reconciliations = sqliteTable('reconciliations', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  contractId: text('contract_id').references(() => contracts.id),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  openingAmount: integer('opening_amount').notNull().default(0),
  contractAmount: integer('contract_amount').notNull().default(0),
  receivedAmount: integer('received_amount').notNull().default(0),
  closingAmount: integer('closing_amount').notNull().default(0),
  status: text('status', { enum: ['pending', 'confirmed', 'disputed'] }).notNull().default('pending'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  confirmedBy: text('confirmed_by').references(() => users.id),
  confirmedAt: text('confirmed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const reconciliationItems = sqliteTable('reconciliation_items', {
  id: text('id').primaryKey(),
  reconciliationId: text('reconciliation_id').notNull().references(() => reconciliations.id),
  paymentId: text('payment_id').notNull(),
  matchedAmount: integer('matched_amount').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
