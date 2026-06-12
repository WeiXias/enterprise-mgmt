ALTER TABLE `im_members` ADD UNIQUE(`conversation_id`, `user_id`);
--> statement-breakpoint
ALTER TABLE `im_read_cursors` ADD UNIQUE(`conversation_id`, `user_id`);
