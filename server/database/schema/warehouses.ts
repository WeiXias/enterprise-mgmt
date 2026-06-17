import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  address: text('address'),
  manager: text('manager'),
  remark: text('remark'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const warehouseLocations = sqliteTable('warehouse_locations', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  remark: text('remark'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
