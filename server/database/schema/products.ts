import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sort: text('sort').notNull().default('0'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => productCategories.id),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  standardPrice: real('standard_price').notNull().default(0),
  costPrice: real('cost_price').notNull().default(0),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  description: text('description'),
  status: text('status', { enum: ['on_sale', 'off_shelf'] }).notNull().default('on_sale'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})
