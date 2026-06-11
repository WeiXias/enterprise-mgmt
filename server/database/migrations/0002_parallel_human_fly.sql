CREATE TABLE `im_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`file_type` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `im_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `im_conversations` ADD `title` text;--> statement-breakpoint
ALTER TABLE `im_conversations` ADD `created_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `im_members` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `im_messages` ADD `type` text DEFAULT 'text' NOT NULL;