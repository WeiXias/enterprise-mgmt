-- 0020: 复式记账会计体系
-- 新表: accounts, accounting_periods, vouchers, voucher_entries, account_balances
-- 旧表处理: 重命名 finance_transactions -> finance_transactions_legacy

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES accounts(id),
  category_type TEXT NOT NULL CHECK(category_type IN ('asset','liability','equity','cost','revenue_expense')),
  balance_direction TEXT NOT NULL CHECK(balance_direction IN ('debit','credit')),
  level INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_code ON accounts(code);

CREATE TABLE accounting_periods (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  closed_by TEXT REFERENCES users(id),
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(year, month)
);

CREATE TABLE vouchers (
  id TEXT PRIMARY KEY,
  voucher_no TEXT NOT NULL,
  voucher_date TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved','posted')),
  source_type TEXT,
  source_id TEXT,
  period_id TEXT REFERENCES accounting_periods(id),
  attachments TEXT,
  prepared_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  approved_at TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_period ON vouchers(period_id);

CREATE TABLE voucher_entries (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL REFERENCES vouchers(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  summary TEXT,
  debit_amount INTEGER NOT NULL DEFAULT 0,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  contract_id TEXT REFERENCES contracts(id),
  project_id TEXT REFERENCES projects(id),
  customer_id TEXT REFERENCES customers(id),
  supplier_id TEXT REFERENCES suppliers(id),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_voucher_entries_voucher ON voucher_entries(voucher_id);
CREATE INDEX idx_voucher_entries_account ON voucher_entries(account_id);

CREATE TABLE account_balances (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  period_id TEXT NOT NULL REFERENCES accounting_periods(id),
  opening_debit INTEGER NOT NULL DEFAULT 0,
  opening_credit INTEGER NOT NULL DEFAULT 0,
  period_debit INTEGER NOT NULL DEFAULT 0,
  period_credit INTEGER NOT NULL DEFAULT 0,
  closing_debit INTEGER NOT NULL DEFAULT 0,
  closing_credit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, period_id)
);
CREATE INDEX idx_account_balances_period ON account_balances(period_id);

-- 旧 finance_transactions 重命名为 legacy，保留历史数据查询
ALTER TABLE finance_transactions RENAME TO finance_transactions_legacy;

-- 重新创建 finance_transactions 表（供新代码使用）
CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  amount INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('contract_payment','commission_payout','reimbursement','manual','purchase_payment')),
  source_id TEXT,
  contract_id TEXT REFERENCES contracts(id),
  project_id TEXT REFERENCES projects(id),
  transaction_date TEXT NOT NULL,
  description TEXT,
  payment_method TEXT CHECK(payment_method IN ('bank_transfer','check','cash','alipay','wechat_pay','other')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
