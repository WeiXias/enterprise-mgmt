import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { contracts } from './contracts'

// ---- AI 供应商 ----
export const aiProviders = sqliteTable('ai_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['deepseek', 'custom'] }).notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key').notNull(), // AES 加密存储
  models: text('models').notNull(),  // JSON 数组字符串
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---- AI 数字员工 ----
export const aiEmployees = sqliteTable('ai_employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', {
    enum: ['contract_reviewer', 'contract_writer', 'opportunity_analyst', 'customer_insight', 'custom'],
  }).notNull(),
  roleLabel: text('role_label').notNull(),    // 显示名称如"合同审核员"
  providerId: text('provider_id').notNull().references(() => aiProviders.id),
  model: text('model').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  temperature: real('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(4096),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---- AI 审核记录 ----
export const aiReviews = sqliteTable('ai_reviews', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  aiEmployeeId: text('ai_employee_id').notNull().references(() => aiEmployees.id),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
    .notNull().default('pending'),
  result: text('result'),           // JSON: AIReviewResult
  rawResponse: text('raw_response'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  modelUsed: text('model_used'),
  duration: integer('duration'),    // 毫秒
  errorMessage: text('error_message'),
  triggeredBy: text('triggered_by').notNull(), // 'auto' | userId
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
