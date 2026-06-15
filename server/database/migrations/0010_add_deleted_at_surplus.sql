-- 追加 deletedAt 列（0008_money_to_cents 中已给 commissions 加了）
-- 本迁移补全剩余表

ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE roles ADD COLUMN deleted_at TEXT;
ALTER TABLE inventory_transactions ADD COLUMN deleted_at TEXT;
ALTER TABLE quotes ADD COLUMN deleted_at TEXT;
ALTER TABLE ai_providers ADD COLUMN deleted_at TEXT;
ALTER TABLE ai_employees ADD COLUMN deleted_at TEXT;

-- departments 已有 deleted_at（在 0000 初始迁移中或其他位置）
-- 此次仅确认：若已存在则 ADD COLUMN 会报错，用 IF NOT EXISTS 模式
-- SQLite 不支持 ADD COLUMN IF NOT EXISTS，若字段已存在跳过即可（迁移工具会处理）
