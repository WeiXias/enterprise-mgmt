CREATE TABLE `inventory_count_items` (
	`id` text PRIMARY KEY NOT NULL,
	`count_id` text NOT NULL,
	`product_id` text NOT NULL,
	`system_quantity` integer DEFAULT 0 NOT NULL,
	`actual_quantity` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`remark` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`count_id`) REFERENCES `inventory_counts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`warehouse_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`planned_date` text,
	`remark` text,
	`created_by` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
