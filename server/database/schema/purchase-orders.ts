import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { products } from './products'
import { suppliers } from './suppliers'

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id),
  contractId: text('contract_id'),
  expectedDate: text('expected_date'),
  totalAmount: integer('total_amount').notNull().default(0),
  status: text('status').notNull().default('draft'),
  remark: text('remark'),
  contractFilePath: text('contract_file_path'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => purchaseOrders.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  discount: real('discount').notNull().default(1),
  amount: integer('amount').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
})
