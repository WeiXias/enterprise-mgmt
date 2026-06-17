CREATE TABLE `warehouse_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`warehouse_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`remark` text,
	`deleted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`manager` text,
	`remark` text,
	`deleted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`contact_person` text,
	`phone` text,
	`email` text,
	`address` text,
	`bank_name` text,
	`bank_account` text,
	`tax_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`remark` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "category_id", "name", "code", "standard_price", "cost_price", "stock_quantity", "description", "status", "created_at", "updated_at", "deleted_at") SELECT "id", "category_id", "name", "code", "standard_price", "cost_price", "stock_quantity", "description", "status", "created_at", "updated_at", "deleted_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);