import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { suppliers, purchaseOrders } from './suppliers'
import { users } from './users'

// 应付账款（采购收货时自动生成）
export const purchasePayables = sqliteTable('purchase_payables', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => purchaseOrders.id),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  totalAmount: integer('total_amount').notNull().default(0),
  paidAmount: integer('paid_amount').notNull().default(0),
  invoiceAmount: integer('invoice_amount').notNull().default(0),
  status: text('status', { enum: ['pending', 'invoiced', 'partially_paid', 'paid'] }).notNull().default('pending'),
  dueDate: text('due_date'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// 供应商发票（收货后供应商开票）
export const purchaseInvoices = sqliteTable('purchase_invoices', {
  id: text('id').primaryKey(),
  payableId: text('payable_id').notNull().references(() => purchasePayables.id),
  orderId: text('order_id').notNull().references(() => purchaseOrders.id),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  invoiceNo: text('invoice_no').notNull(),
  amount: integer('amount').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  status: text('status', { enum: ['submitted', 'confirmed', 'rejected'] }).notNull().default('submitted'),
  filePath: text('file_path'),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  confirmedBy: text('confirmed_by').references(() => users.id),
  confirmedAt: text('confirmed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

// 供应商付款记录
export const purchasePayments = sqliteTable('purchase_payments', {
  id: text('id').primaryKey(),
  payableId: text('payable_id').notNull().references(() => purchasePayables.id),
  orderId: text('order_id').notNull().references(() => purchaseOrders.id),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  amount: integer('amount').notNull().default(0),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method', { enum: ['bank_transfer', 'check', 'cash', 'alipay', 'wechat_pay', 'other'] }),
  remark: text('remark'),
  attachmentPath: text('attachment_path'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})
