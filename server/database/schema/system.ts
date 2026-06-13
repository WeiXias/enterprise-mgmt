import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const systemConfig = sqliteTable('system_config', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  remark: text('remark'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const codeRules = sqliteTable('code_rules', {
  id: text('id').primaryKey(),
  module: text('module').notNull().unique(),
  prefix: text('prefix').notNull(),
  datePart: text('date_part', { enum: ['none', 'year', 'year_month', 'year_month_day'] }).notNull().default('year_month'),
  seqLength: text('seq_length').notNull().default('4'),
  separator: text('separator').notNull().default('-'),
  currentSeq: text('current_seq').notNull().default('0'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: text('file_size'),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// 数据字典条目表 — 统一管理业务分类数据
export const dictEntries = sqliteTable('dict_entries', {
  id: text('id').primaryKey(),
  dict_type: text('dict_type').notNull(),
  value: text('value').notNull(),
  label: text('label').notNull(),
  sort: text('sort').notNull().default('0'),
  is_active: text('is_active').notNull().default('1'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})
