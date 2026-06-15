-- 迁移：金额字段从浮点(元)改为整数(分)
-- 策略：新加 _cents 列 → 数据迁移 *100 → 删旧列 → 重命名
-- SQLite 3.35+ 支持 DROP COLUMN

-- ==================== contracts ====================
ALTER TABLE contracts ADD COLUMN total_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE contracts SET total_amount_cents = CAST(ROUND(total_amount * 100) AS INTEGER);
ALTER TABLE contracts DROP COLUMN total_amount;
ALTER TABLE contracts RENAME COLUMN total_amount_cents TO total_amount;

ALTER TABLE contracts ADD COLUMN service_fee_cents INTEGER DEFAULT 0;
UPDATE contracts SET service_fee_cents = CAST(ROUND(service_fee * 100) AS INTEGER);
ALTER TABLE contracts DROP COLUMN service_fee;
ALTER TABLE contracts RENAME COLUMN service_fee_cents TO service_fee;

-- ==================== contract_products ====================
ALTER TABLE contract_products ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0;
UPDATE contract_products SET unit_price_cents = CAST(ROUND(unit_price * 100) AS INTEGER);
ALTER TABLE contract_products DROP COLUMN unit_price;
ALTER TABLE contract_products RENAME COLUMN unit_price_cents TO unit_price;

-- ==================== payment_plans ====================
ALTER TABLE payment_plans ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE payment_plans SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE payment_plans DROP COLUMN amount;
ALTER TABLE payment_plans RENAME COLUMN amount_cents TO amount;

-- ==================== payments ====================
ALTER TABLE payments ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE payments SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE payments DROP COLUMN amount;
ALTER TABLE payments RENAME COLUMN amount_cents TO amount;

-- ==================== commissions ====================
ALTER TABLE commissions ADD COLUMN base_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE commissions SET base_amount_cents = CAST(ROUND(base_amount * 100) AS INTEGER);
ALTER TABLE commissions DROP COLUMN base_amount;
ALTER TABLE commissions RENAME COLUMN base_amount_cents TO base_amount;

ALTER TABLE commissions ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE commissions SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE commissions DROP COLUMN amount;
ALTER TABLE commissions RENAME COLUMN amount_cents TO amount;

ALTER TABLE commissions ADD COLUMN adjust_amount_cents INTEGER DEFAULT 0;
UPDATE commissions SET adjust_amount_cents = CAST(ROUND(adjust_amount * 100) AS INTEGER);
ALTER TABLE commissions DROP COLUMN adjust_amount;
ALTER TABLE commissions RENAME COLUMN adjust_amount_cents TO adjust_amount;

ALTER TABLE commissions ADD COLUMN deleted_at TEXT;
UPDATE commissions SET deleted_at = NULL;

-- ==================== commission_rules ====================
ALTER TABLE commission_rules ADD COLUMN min_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE commission_rules SET min_amount_cents = CAST(ROUND(min_amount * 100) AS INTEGER);
ALTER TABLE commission_rules DROP COLUMN min_amount;
ALTER TABLE commission_rules RENAME COLUMN min_amount_cents TO min_amount;

ALTER TABLE commission_rules ADD COLUMN max_amount_cents INTEGER;
UPDATE commission_rules SET max_amount_cents = CAST(ROUND(max_amount * 100) AS INTEGER);
ALTER TABLE commission_rules DROP COLUMN max_amount;
ALTER TABLE commission_rules RENAME COLUMN max_amount_cents TO max_amount;

-- ==================== commission_payouts ====================
ALTER TABLE commission_payouts ADD COLUMN total_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE commission_payouts SET total_amount_cents = CAST(ROUND(total_amount * 100) AS INTEGER);
ALTER TABLE commission_payouts DROP COLUMN total_amount;
ALTER TABLE commission_payouts RENAME COLUMN total_amount_cents TO total_amount;

-- ==================== commission_payout_items ====================
ALTER TABLE commission_payout_items ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE commission_payout_items SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE commission_payout_items DROP COLUMN amount;
ALTER TABLE commission_payout_items RENAME COLUMN amount_cents TO amount;

-- ==================== finance_transactions ====================
ALTER TABLE finance_transactions ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE finance_transactions SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE finance_transactions DROP COLUMN amount;
ALTER TABLE finance_transactions RENAME COLUMN amount_cents TO amount;

-- ==================== reimbursements ====================
ALTER TABLE reimbursements ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE reimbursements SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE reimbursements DROP COLUMN amount;
ALTER TABLE reimbursements RENAME COLUMN amount_cents TO amount;

-- ==================== budgets ====================
ALTER TABLE budgets ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE budgets SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE budgets DROP COLUMN amount;
ALTER TABLE budgets RENAME COLUMN amount_cents TO amount;

-- ==================== products ====================
ALTER TABLE products ADD COLUMN standard_price_cents INTEGER NOT NULL DEFAULT 0;
UPDATE products SET standard_price_cents = CAST(ROUND(standard_price * 100) AS INTEGER);
ALTER TABLE products DROP COLUMN standard_price;
ALTER TABLE products RENAME COLUMN standard_price_cents TO standard_price;

ALTER TABLE products ADD COLUMN cost_price_cents INTEGER NOT NULL DEFAULT 0;
UPDATE products SET cost_price_cents = CAST(ROUND(cost_price * 100) AS INTEGER);
ALTER TABLE products DROP COLUMN cost_price;
ALTER TABLE products RENAME COLUMN cost_price_cents TO cost_price;

-- ==================== opportunities ====================
ALTER TABLE opportunities ADD COLUMN estimated_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE opportunities SET estimated_amount_cents = CAST(ROUND(estimated_amount * 100) AS INTEGER);
ALTER TABLE opportunities DROP COLUMN estimated_amount;
ALTER TABLE opportunities RENAME COLUMN estimated_amount_cents TO estimated_amount;

-- ==================== opportunity_products ====================
ALTER TABLE opportunity_products ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0;
UPDATE opportunity_products SET unit_price_cents = CAST(ROUND(unit_price * 100) AS INTEGER);
ALTER TABLE opportunity_products DROP COLUMN unit_price;
ALTER TABLE opportunity_products RENAME COLUMN unit_price_cents TO unit_price;

-- ==================== quotes ====================
ALTER TABLE quotes ADD COLUMN total_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE quotes SET total_amount_cents = CAST(ROUND(total_amount * 100) AS INTEGER);
ALTER TABLE quotes DROP COLUMN total_amount;
ALTER TABLE quotes RENAME COLUMN total_amount_cents TO total_amount;

-- ==================== quote_products ====================
ALTER TABLE quote_products ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0;
UPDATE quote_products SET unit_price_cents = CAST(ROUND(unit_price * 100) AS INTEGER);
ALTER TABLE quote_products DROP COLUMN unit_price;
ALTER TABLE quote_products RENAME COLUMN unit_price_cents TO unit_price;

-- ==================== invoices ====================
ALTER TABLE invoices ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE invoices SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER);
ALTER TABLE invoices DROP COLUMN amount;
ALTER TABLE invoices RENAME COLUMN amount_cents TO amount;

ALTER TABLE invoices ADD COLUMN tax_amount_cents INTEGER NOT NULL DEFAULT 0;
UPDATE invoices SET tax_amount_cents = CAST(ROUND(tax_amount * 100) AS INTEGER);
ALTER TABLE invoices DROP COLUMN tax_amount;
ALTER TABLE invoices RENAME COLUMN tax_amount_cents TO tax_amount;

-- ==================== projects ====================
ALTER TABLE projects ADD COLUMN budget_cents INTEGER NOT NULL DEFAULT 0;
UPDATE projects SET budget_cents = CAST(ROUND(budget * 100) AS INTEGER);
ALTER TABLE projects DROP COLUMN budget;
ALTER TABLE projects RENAME COLUMN budget_cents TO budget;

-- ==================== inventory_transactions ====================
ALTER TABLE inventory_transactions ADD COLUMN unit_price_cents INTEGER DEFAULT 0;
UPDATE inventory_transactions SET unit_price_cents = CAST(ROUND(unit_price * 100) AS INTEGER);
ALTER TABLE inventory_transactions DROP COLUMN unit_price;
ALTER TABLE inventory_transactions RENAME COLUMN unit_price_cents TO unit_price;

-- ==================== users ====================
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
