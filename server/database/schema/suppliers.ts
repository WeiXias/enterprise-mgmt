import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  taxId: text('tax_id'),
  status: text('status').notNull().default('active'),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  supplierId: text('supplier_id'),
  totalAmount: integer('total_amount').notNull().default(0),
  status: text('status').notNull().default('draft'),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})
