import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry'),
  registeredAddress: text('registered_address'),
  officeAddress: text('office_address'),
  remark: text('remark'),
  status: text('status', { enum: ['potential', 'intentional', 'closed', 'lost'] }).notNull().default('potential'),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  lostReason: text('lost_reason'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  position: text('position'),
  phone: text('phone'),
  email: text('email'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const customerTags = sqliteTable('customer_tags', {
  customerId: text('customer_id').notNull().references(() => customers.id),
  tagId: text('tag_id').notNull().references(() => tags.id)
})

export const followUps = sqliteTable('follow_ups', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  opportunityId: text('opportunity_id'),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['phone', 'visit', 'wechat', 'email', 'other'] }).notNull().default('phone'),
  content: text('content').notNull(),
  nextFollowUpAt: text('next_follow_up_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const customerTransfers = sqliteTable('customer_transfers', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  fromUserId: text('from_user_id').notNull().references(() => users.id),
  toUserId: text('to_user_id').notNull().references(() => users.id),
  reason: text('reason'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})
