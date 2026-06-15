-- 追加索引：覆盖 0007 遗漏的高频查询列
-- soft-delete 列补充
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_commissions_deleted_at ON commissions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_subcontracts_deleted_at ON subcontracts(deleted_at);

-- FK 查询列补充
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_contract ON commissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_commissions_rule ON commissions(rule_id);
CREATE INDEX IF NOT EXISTS idx_contracts_parent ON contracts(parent_contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_contract ON payment_plans(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan ON payments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 搜索列补充
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- FK 约束补齐（inventoryTransactions.productId 之前缺 references）
-- SQLite 不支持 ALTER ADD CONSTRAINT，重建表风险太大，通过索引补偿
