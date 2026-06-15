-- 补救 schema 与物理数据库的列差
-- token_version 用于 JWT 版本号机制
-- deleted_at 用于软删除

ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE roles ADD COLUMN deleted_at TEXT;
ALTER TABLE inventory_transactions ADD COLUMN deleted_at TEXT;
ALTER TABLE quotes ADD COLUMN deleted_at TEXT;
ALTER TABLE ai_providers ADD COLUMN deleted_at TEXT;
ALTER TABLE ai_employees ADD COLUMN deleted_at TEXT;
ALTER TABLE commissions ADD COLUMN deleted_at TEXT;
