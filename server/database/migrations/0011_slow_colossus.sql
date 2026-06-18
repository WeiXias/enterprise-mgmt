CREATE TABLE `contract_content_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`content` text,
	`version` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `docx_content` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `version` integer DEFAULT 1 NOT NULL;