import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers'
import { users } from './users'
import { products } from './products'
import { opportunities } from './opportunities'
import { suppliers } from './suppliers'

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  opportunityId: text('opportunity_id').references(() => opportunities.id),
  supplierId: text('supplier_id').references(() => suppliers.id),
  partyA: text('party_a').notNull(),
  partyB: text('party_b').notNull(),
  totalAmount: integer('total_amount').notNull().default(0),
  paymentMethod: text('payment_method'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status', { enum: ['draft', 'approved', 'in_progress', 'completed', 'terminated'] }).notNull().default('draft'),
  rejectReason: text('reject_reason'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  ownerUserId: text('owner_user_id').references(() => users.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
  version: integer('version').notNull().default(1),
  content: text('content'), // 合同正文（ProseMirror JSON 或 HTML）
})

export const contractProducts = sqliteTable('contract_products', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  discount: real('discount').notNull().default(1)
})

export const paymentPlans = sqliteTable('payment_plans', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  amount: integer('amount').notNull().default(0),
  planDate: text('plan_date').notNull(),
  remark: text('remark'),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').references(() => contracts.id),
  paymentPlanId: text('payment_plan_id').references(() => paymentPlans.id),
  amount: integer('amount').notNull().default(0),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method', { enum: ['bank_transfer', 'check', 'cash', 'alipay', 'wechat_pay', 'other'] }),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
  type: text('type', { enum: ['normal'] }).notNull().default('normal'),
  customerId: text('customer_id').references(() => customers.id),
  reconciledAt: text('reconciled_at'),
  reconciledById: text('reconciled_by_id').references(() => users.id),
  remainingAmount: integer('remaining_amount'),
  refundedAt: text('refunded_at'),
  refundTransactionId: text('refund_transaction_id'),
})

export const contractAttachments = sqliteTable('contract_attachments', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  contentHash: text('content_hash'),
})

export const contractContentVersions = sqliteTable('contract_content_versions', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  content: text('content'),
  version: integer('version').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const contractTemplates = sqliteTable('contract_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  content: text('content'),
  placeholders: text('placeholders'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})