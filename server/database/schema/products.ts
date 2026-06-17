import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sort: text('sort').notNull().default('0'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id'),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  standardPrice: integer('standard_price').notNull().default(0),
  costPrice: integer('cost_price').notNull().default(0),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  description: text('description'),
  status: text('status', { enum: ['on_sale', 'off_shelf'] }).notNull().default('on_sale'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
})

// 产品图片（多图）
export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  sort: integer('sort').notNull().default(0),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  contentHash: text('content_hash'),
})

// 产品规格
export const productSpecs = sqliteTable('product_specs', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  specTemplate: text('spec_template').notNull(),
  specKey: text('spec_key').notNull(),
  specValue: text('spec_value').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
