CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`spec_template` text NOT NULL,
	`spec_key` text NOT NULL,
	`spec_value` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_commission_payout_items` (
	`id` text PRIMARY KEY NOT NULL,
	`payout_id` text NOT NULL,
	`commission_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`payout_id`) REFERENCES `commission_payouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commission_id`) REFERENCES `commissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_commission_payout_items`("id", "payout_id", "commission_id", "user_id", "amount") SELECT "id", "payout_id", "commission_id", "user_id", "amount" FROM `commission_payout_items`;--> statement-breakpoint
DROP TABLE `commission_payout_items`;--> statement-breakpoint
ALTER TABLE `__new_commission_payout_items` RENAME TO `commission_payout_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_commission_payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`period_month` text NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`paid_at` text,
	`remark` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_commission_payouts`("id", "period_month", "total_amount", "status", "paid_at", "remark", "created_by", "created_at") SELECT "id", "period_month", "total_amount", "status", "paid_at", "remark", "created_by", "created_at" FROM `commission_payouts`;--> statement-breakpoint
DROP TABLE `commission_payouts`;--> statement-breakpoint
ALTER TABLE `__new_commission_payouts` RENAME TO `commission_payouts`;--> statement-breakpoint
CREATE TABLE `__new_commission_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_type` text DEFAULT 'payment_amount' NOT NULL,
	`product_id` text,
	`min_amount` integer DEFAULT 0 NOT NULL,
	`max_amount` integer,
	`rate` real DEFAULT 0 NOT NULL,
	`is_active` text DEFAULT 'yes' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_commission_rules`("id", "name", "base_type", "product_id", "min_amount", "max_amount", "rate", "is_active", "created_at", "updated_at") SELECT "id", "name", "base_type", "product_id", "min_amount", "max_amount", "rate", "is_active", "created_at", "updated_at" FROM `commission_rules`;--> statement-breakpoint
DROP TABLE `commission_rules`;--> statement-breakpoint
ALTER TABLE `__new_commission_rules` RENAME TO `commission_rules`;--> statement-breakpoint
CREATE TABLE `__new_commissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`payment_id` text,
	`rule_id` text,
	`base_amount` integer DEFAULT 0 NOT NULL,
	`rate` real DEFAULT 0 NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`adjust_amount` integer DEFAULT 0,
	`adjust_reason` text,
	`approved_by` text,
	`approved_at` text,
	`period_month` text NOT NULL,
	`remark` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rule_id`) REFERENCES `commission_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_commissions`("id", "user_id", "contract_id", "payment_id", "rule_id", "base_amount", "rate", "amount", "status", "adjust_amount", "adjust_reason", "approved_by", "approved_at", "period_month", "remark", "created_at", "deleted_at") SELECT "id", "user_id", "contract_id", "payment_id", "rule_id", "base_amount", "rate", "amount", "status", "adjust_amount", "adjust_reason", "approved_by", "approved_at", "period_month", "remark", "created_at", "deleted_at" FROM `commissions`;--> statement-breakpoint
DROP TABLE `commissions`;--> statement-breakpoint
ALTER TABLE `__new_commissions` RENAME TO `commissions`;--> statement-breakpoint
CREATE TABLE `__new_contract_products` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_contract_products`("id", "contract_id", "product_id", "quantity", "unit_price", "discount") SELECT "id", "contract_id", "product_id", "quantity", "unit_price", "discount" FROM `contract_products`;--> statement-breakpoint
DROP TABLE `contract_products`;--> statement-breakpoint
ALTER TABLE `__new_contract_products` RENAME TO `contract_products`;--> statement-breakpoint
CREATE TABLE `__new_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`customer_id` text NOT NULL,
	`opportunity_id` text,
	`party_a` text NOT NULL,
	`party_b` text NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`reject_reason` text,
	`approved_by` text,
	`approved_at` text,
	`owner_user_id` text,
	`created_by` text NOT NULL,
	`remark` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	`parent_contract_id` text,
	`contract_type` text DEFAULT 'main' NOT NULL,
	`subcontract_party_id` text,
	`tax_rate` real DEFAULT 0.05,
	`service_fee` integer DEFAULT 0,
	`content` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_contracts`("id", "code", "name", "customer_id", "opportunity_id", "party_a", "party_b", "total_amount", "payment_method", "start_date", "end_date", "status", "reject_reason", "approved_by", "approved_at", "owner_user_id", "created_by", "remark", "created_at", "updated_at", "deleted_at", "parent_contract_id", "contract_type", "subcontract_party_id", "tax_rate", "service_fee", "content") SELECT "id", "code", "name", "customer_id", "opportunity_id", "party_a", "party_b", "total_amount", "payment_method", "start_date", "end_date", "status", "reject_reason", "approved_by", "approved_at", "owner_user_id", "created_by", "remark", "created_at", "updated_at", "deleted_at", "parent_contract_id", "contract_type", "subcontract_party_id", "tax_rate", "service_fee", "content" FROM `contracts`;--> statement-breakpoint
DROP TABLE `contracts`;--> statement-breakpoint
ALTER TABLE `__new_contracts` RENAME TO `contracts`;--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_code_unique` ON `contracts` (`code`);--> statement-breakpoint
CREATE TABLE `__new_payment_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`plan_date` text NOT NULL,
	`remark` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_payment_plans`("id", "contract_id", "amount", "plan_date", "remark", "status", "created_at", "deleted_at") SELECT "id", "contract_id", "amount", "plan_date", "remark", "status", "created_at", "deleted_at" FROM `payment_plans`;--> statement-breakpoint
DROP TABLE `payment_plans`;--> statement-breakpoint
ALTER TABLE `__new_payment_plans` RENAME TO `payment_plans`;--> statement-breakpoint
CREATE TABLE `__new_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`payment_plan_id` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`payment_date` text NOT NULL,
	`payment_method` text,
	`remark` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_plan_id`) REFERENCES `payment_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_payments`("id", "contract_id", "payment_plan_id", "amount", "payment_date", "payment_method", "remark", "created_by", "created_at", "deleted_at") SELECT "id", "contract_id", "payment_plan_id", "amount", "payment_date", "payment_method", "remark", "created_by", "created_at", "deleted_at" FROM `payments`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
ALTER TABLE `__new_payments` RENAME TO `payments`;--> statement-breakpoint
CREATE TABLE `__new_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer,
	`type` text DEFAULT 'expense' NOT NULL,
	`category` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`project_id` text,
	`department_id` text,
	`remark` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_budgets`("id", "name", "year", "month", "type", "category", "amount", "project_id", "department_id", "remark", "created_by", "created_at", "updated_at") SELECT "id", "name", "year", "month", "type", "category", "amount", "project_id", "department_id", "remark", "created_by", "created_at", "updated_at" FROM `budgets`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `__new_budgets` RENAME TO `budgets`;--> statement-breakpoint
CREATE TABLE `__new_finance_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`category` text NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_id` text,
	`contract_id` text,
	`project_id` text,
	`transaction_date` text NOT NULL,
	`description` text,
	`payment_method` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_finance_transactions`("id", "type", "amount", "category", "source_type", "source_id", "contract_id", "project_id", "transaction_date", "description", "payment_method", "created_by", "created_at", "deleted_at") SELECT "id", "type", "amount", "category", "source_type", "source_id", "contract_id", "project_id", "transaction_date", "description", "payment_method", "created_by", "created_at", "deleted_at" FROM `finance_transactions`;--> statement-breakpoint
DROP TABLE `finance_transactions`;--> statement-breakpoint
ALTER TABLE `__new_finance_transactions` RENAME TO `finance_transactions`;--> statement-breakpoint
CREATE TABLE `__new_reimbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`receipt_urls` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`rejected_reason` text,
	`project_id` text,
	`paid_at` text,
	`paid_transaction_id` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reimbursements`("id", "user_id", "type", "amount", "reason", "receipt_urls", "status", "approved_by", "approved_at", "rejected_reason", "project_id", "paid_at", "paid_transaction_id", "created_by", "created_at", "deleted_at") SELECT "id", "user_id", "type", "amount", "reason", "receipt_urls", "status", "approved_by", "approved_at", "rejected_reason", "project_id", "paid_at", "paid_transaction_id", "created_by", "created_at", "deleted_at" FROM `reimbursements`;--> statement-breakpoint
DROP TABLE `reimbursements`;--> statement-breakpoint
ALTER TABLE `__new_reimbursements` RENAME TO `reimbursements`;--> statement-breakpoint
CREATE TABLE `__new_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`customer_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`estimated_amount` integer DEFAULT 0 NOT NULL,
	`estimated_close_date` text,
	`source` text,
	`competitor` text,
	`status` text DEFAULT 'initial_contact' NOT NULL,
	`lost_reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_opportunities`("id", "name", "customer_id", "owner_user_id", "estimated_amount", "estimated_close_date", "source", "competitor", "status", "lost_reason", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "customer_id", "owner_user_id", "estimated_amount", "estimated_close_date", "source", "competitor", "status", "lost_reason", "created_at", "updated_at", "deleted_at" FROM `opportunities`;--> statement-breakpoint
DROP TABLE `opportunities`;--> statement-breakpoint
ALTER TABLE `__new_opportunities` RENAME TO `opportunities`;--> statement-breakpoint
CREATE TABLE `__new_opportunity_products` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_opportunity_products`("id", "opportunity_id", "product_id", "quantity", "unit_price", "discount") SELECT "id", "opportunity_id", "product_id", "quantity", "unit_price", "discount" FROM `opportunity_products`;--> statement-breakpoint
DROP TABLE `opportunity_products`;--> statement-breakpoint
ALTER TABLE `__new_opportunity_products` RENAME TO `opportunity_products`;--> statement-breakpoint
CREATE TABLE `__new_quote_products` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_quote_products`("id", "quote_id", "product_id", "quantity", "unit_price", "discount") SELECT "id", "quote_id", "product_id", "quantity", "unit_price", "discount" FROM `quote_products`;--> statement-breakpoint
DROP TABLE `quote_products`;--> statement-breakpoint
ALTER TABLE `__new_quote_products` RENAME TO `quote_products`;--> statement-breakpoint
CREATE TABLE `__new_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`name` text NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`pdf_path` text,
	`valid_until` text,
	`remark` text,
	`created_by` text NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_quotes`("id", "opportunity_id", "name", "total_amount", "status", "pdf_path", "valid_until", "remark", "created_by", "deleted_at", "created_at", "updated_at") SELECT "id", "opportunity_id", "name", "total_amount", "status", "pdf_path", "valid_until", "remark", "created_by", "deleted_at", "created_at", "updated_at" FROM `quotes`;--> statement-breakpoint
DROP TABLE `quotes`;--> statement-breakpoint
ALTER TABLE `__new_quotes` RENAME TO `quotes`;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`standard_price` integer DEFAULT 0 NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`description` text,
	`status` text DEFAULT 'on_sale' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "category_id", "name", "code", "standard_price", "cost_price", "stock_quantity", "description", "status", "created_at", "updated_at", "deleted_at") SELECT "id", "category_id", "name", "code", "standard_price", "cost_price", "stock_quantity", "description", "status", "created_at", "updated_at", "deleted_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contract_id` text,
	`owner_user_id` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`budget` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`remark` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "name", "contract_id", "owner_user_id", "start_date", "end_date", "budget", "status", "remark", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "contract_id", "owner_user_id", "start_date", "end_date", "budget", "status", "remark", "created_at", "updated_at", "deleted_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_inventory_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer DEFAULT 0,
	`contract_id` text,
	`project_id` text,
	`batch_no` text,
	`remark` text,
	`operator_id` text NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_inventory_transactions`("id", "product_id", "type", "quantity", "unit_price", "contract_id", "project_id", "batch_no", "remark", "operator_id", "deleted_at", "created_at") SELECT "id", "product_id", "type", "quantity", "unit_price", "contract_id", "project_id", "batch_no", "remark", "operator_id", "deleted_at", "created_at" FROM `inventory_transactions`;--> statement-breakpoint
DROP TABLE `inventory_transactions`;--> statement-breakpoint
ALTER TABLE `__new_inventory_transactions` RENAME TO `inventory_transactions`;--> statement-breakpoint
CREATE TABLE `__new_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_no` text NOT NULL,
	`type` text DEFAULT 'vat_normal' NOT NULL,
	`contract_id` text,
	`customer_id` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`issued_at` text,
	`due_date` text,
	`remark` text,
	`file_path` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_invoices`("id", "invoice_no", "type", "contract_id", "customer_id", "amount", "tax_rate", "tax_amount", "status", "issued_at", "due_date", "remark", "file_path", "created_by", "created_at") SELECT "id", "invoice_no", "type", "contract_id", "customer_id", "amount", "tax_rate", "tax_amount", "status", "issued_at", "due_date", "remark", "file_path", "created_by", "created_at" FROM `invoices`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
ALTER TABLE `__new_invoices` RENAME TO `invoices`;--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_no_unique` ON `invoices` (`invoice_no`);--> statement-breakpoint
ALTER TABLE `ai_employees` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `ai_providers` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `updated_at` text DEFAULT (datetime('now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `follow_ups` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `tags` ADD `updated_at` text DEFAULT (datetime('now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `roles` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `token_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` text;