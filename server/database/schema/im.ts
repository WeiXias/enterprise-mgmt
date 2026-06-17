import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const imConversations = sqliteTable('im_conversations', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['direct', 'group'] }).notNull().default('direct'),
  title: text('title'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const imMembers = sqliteTable('im_members', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => imConversations.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  joinedAt: text('joined_at').notNull().default(sql`(datetime('now'))`),
})

export const imMessages = sqliteTable('im_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => imConversations.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  type: text('type', { enum: ['text', 'file'] }).notNull().default('text'),
  content: text('content').notNull(),
  mentions: text('mentions'),
  replyTo: text('reply_to'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

export const imAttachments = sqliteTable('im_attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => imMessages.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  fileType: text('file_type').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  contentHash: text('content_hash'),
})

export const imReadCursors = sqliteTable('im_read_cursors', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => imConversations.id),
  userId: text('user_id').notNull().references(() => users.id),
  lastReadMessageId: text('last_read_message_id').references(() => imMessages.id),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
