CREATE TABLE `deposit_write_offs` (
	`id` text PRIMARY KEY NOT NULL,
	`deposit_payment_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`remark` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`applied_by` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`deposit_payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applied_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`reconciliation_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`matched_amount` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`customer_id` text NOT NULL,
	`contract_id` text,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`opening_amount` integer DEFAULT 0 NOT NULL,
	`contract_amount` integer DEFAULT 0 NOT NULL,
	`received_amount` integer DEFAULT 0 NOT NULL,
	`closing_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`remark` text,
	`created_by` text NOT NULL,
	`confirmed_by` text,
	`confirmed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliations_code_unique` ON `reconciliations` (`code`);--> statement-breakpoint
ALTER TABLE `payments` ADD `type` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `customer_id` text REFERENCES customers(id);--> statement-breakpoint
ALTER TABLE `payments` ADD `reconciled_at` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `reconciled_by_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `payments` ADD `remaining_amount` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `refunded_at` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `refund_transaction_id` text;