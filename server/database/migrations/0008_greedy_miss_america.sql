CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`supplier_id` text,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`remark` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
ALTER TABLE `contract_attachments` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `im_attachments` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `product_images` ADD `content_hash` text;