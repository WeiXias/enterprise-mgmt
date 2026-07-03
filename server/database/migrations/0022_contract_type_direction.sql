-- 0022: contracts 表增加 type（销售/采购）和 direction（收入/支出）字段，支持供应商合同
ALTER TABLE contracts ADD COLUMN type TEXT NOT NULL DEFAULT 'sales';
ALTER TABLE contracts ADD COLUMN direction TEXT NOT NULL DEFAULT 'income';
