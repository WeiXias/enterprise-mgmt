-- Purchase-Finance integration: payables, invoices, payments
CREATE TABLE purchase_payables (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  invoice_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','invoiced','partially_paid','paid')),
  due_date TEXT,
  remark TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE purchase_invoices (
  id TEXT PRIMARY KEY,
  payable_id TEXT NOT NULL REFERENCES purchase_payables(id),
  order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  invoice_no TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','confirmed','rejected')),
  file_path TEXT,
  remark TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  confirmed_by TEXT REFERENCES users(id),
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE purchase_payments (
  id TEXT PRIMARY KEY,
  payable_id TEXT NOT NULL REFERENCES purchase_payables(id),
  order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  amount INTEGER NOT NULL DEFAULT 0,
  payment_date TEXT NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('bank_transfer','check','cash','alipay','wechat_pay','other')),
  remark TEXT,
  attachment_path TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
