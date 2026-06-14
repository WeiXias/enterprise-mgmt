-- Add business indexes for high-frequency WHERE columns
-- Soft-delete columns (used in ~152 queries)
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at ON opportunities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Foreign key lookups (owner/user/customer/project references)
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_owner ON contracts(owner_user_id);

-- Status columns for filtered lists
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Follow-ups by customer
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);

-- Tasks by project
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- Payments by contract
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
