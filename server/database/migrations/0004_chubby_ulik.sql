CREATE TABLE `dict_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`dict_type` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`sort` text DEFAULT '0' NOT NULL,
	`is_active` text DEFAULT '1' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `im_messages` ADD `reply_to` text;