import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  type: text('type', { enum: ['inbound', 'outbound', 'adjustment'] }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').default(0),
  contractId: text('contract_id'),
  projectId: text('project_id'),
  batchNo: text('batch_no'),
  remark: text('remark'),
  operatorId: text('operator_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
