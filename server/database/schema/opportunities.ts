import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers'
import { users } from './users'
import { products } from './products'

export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  estimatedAmount: integer('estimated_amount').notNull().default(0),
  estimatedCloseDate: text('estimated_close_date'),
  source: text('source'),
  competitor: text('competitor'),
  status: text('status', { enum: ['initial_contact', 'requirement_confirmed', 'proposal_submitted', 'business_negotiation', 'closed_won', 'closed_lost'] }).notNull().default('initial_contact'),
  lostReason: text('lost_reason'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

export const opportunityProducts = sqliteTable('opportunity_products', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull().references(() => opportunities.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  discount: real('discount').notNull().default(1)
})

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull().references(() => opportunities.id),
  name: text('name').notNull(),
  totalAmount: integer('total_amount').notNull().default(0),
  status: text('status', { enum: ['draft', 'sent', 'accepted', 'rejected'] }).notNull().default('draft'),
  pdfPath: text('pdf_path'),
  validUntil: text('valid_until'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const quoteProducts = sqliteTable('quote_products', {
  id: text('id').primaryKey(),
  quoteId: text('quote_id').notNull().references(() => quotes.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  discount: real('discount').notNull().default(1)
})
