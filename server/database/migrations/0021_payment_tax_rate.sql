-- 0021: payments 表增加税率字段，支持增值税核算
ALTER TABLE payments ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;
