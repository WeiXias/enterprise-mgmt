-- 采购订单 - 合同文件 & 产品税率 & 应付税额
ALTER TABLE purchase_orders ADD COLUMN contract_file_path TEXT;
ALTER TABLE purchase_order_items ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;
ALTER TABLE purchase_payables ADD COLUMN tax_amount INTEGER NOT NULL DEFAULT 0;
