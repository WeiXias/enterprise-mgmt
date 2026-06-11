import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNo: text('invoice_no').notNull().unique(),
  type: text('type', { enum: ['vat_special', 'vat_normal', 'electronic'] }).notNull().default('vat_normal'),
  contractId: text('contract_id'),
  customerId: text('customer_id'),
  amount: real('amount').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  status: text('status', { enum: ['pending', 'issued', 'voided'] }).notNull().default('pending'),
  issuedAt: text('issued_at'),
  dueDate: text('due_date'),
  remark: text('remark'),
  filePath: text('file_path'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
