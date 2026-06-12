CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer,
	`type` text DEFAULT 'expense' NOT NULL,
	`category` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
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
CREATE TABLE `todo_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'amber' NOT NULL,
	`icon` text DEFAULT 'i-lucide-list-checks',
	`sort_order` integer DEFAULT 0 NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todo_subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`todo_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todo_tag_relations` (
	`todo_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `todo_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todo_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'amber',
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`priority` text DEFAULT 'not_urgent_not_important' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text,
	`remind_at` text,
	`completed_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`user_id` text NOT NULL,
	`customer_id` text,
	`contract_id` text,
	`project_id` text,
	`opportunity_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
