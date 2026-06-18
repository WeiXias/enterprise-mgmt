import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { products } from './products'
import { warehouses } from './warehouses'
import { users } from './users'

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  type: text('type', { enum: ['inbound', 'outbound', 'adjustment'] }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').default(0),
  contractId: text('contract_id'),
  projectId: text('project_id'),
  batchNo: text('batch_no'),
  remark: text('remark'),
  operatorId: text('operator_id').notNull(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const inventoryCounts = sqliteTable('inventory_counts', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id),
  status: text('status', { enum: ['draft', 'counting', 'completed'] }).notNull().default('draft'),
  plannedDate: text('planned_date'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const inventoryCountItems = sqliteTable('inventory_count_items', {
  id: text('id').primaryKey(),
  countId: text('count_id').notNull().references(() => inventoryCounts.id),
  productId: text('product_id').notNull().references(() => products.id),
  systemQuantity: integer('system_quantity').notNull().default(0),
  actualQuantity: integer('actual_quantity'),
  status: text('status', { enum: ['pending', 'counted', 'reviewed'] }).notNull().default('pending'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})
