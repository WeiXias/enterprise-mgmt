import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from './customers'
import { users } from './users'
import { products } from './products'
import { opportunities } from './opportunities'

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  opportunityId: text('opportunity_id').references(() => opportunities.id),
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
  parentContractId: text('parent_contract_id'),
  contractType: text('contract_type', { enum: ['main', 'subcontract'] }).notNull().default('main'),
  subcontractPartyId: text('subcontract_party_id'),
  taxRate: real('tax_rate').default(0.05),
  serviceFee: integer('service_fee').default(0),
  content: text('content'), // 合同正文（HTML 富文本）
})

export const subcontractParties = sqliteTable('subcontract_parties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  remark: text('remark'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
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
  contractId: text('contract_id').notNull().references(() => contracts.id),
  paymentPlanId: text('payment_plan_id').references(() => paymentPlans.id),
  amount: integer('amount').notNull().default(0),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method', { enum: ['bank_transfer', 'check', 'cash', 'alipay', 'wechat_pay', 'other'] }),
  remark: text('remark'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const contractAttachments = sqliteTable('contract_attachments', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 合同模板表
export const contractTemplates = sqliteTable('contract_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', { enum: ['sales', 'procurement', 'service', 'other'] }).notNull(),
  content: text('content'),
  placeholders: text('placeholders'), // JSON: [{"key":"partyA","label":"甲方","defaultValue":""}]
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})
