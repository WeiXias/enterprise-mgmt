ALTER TABLE `im_messages` ADD `reply_to` text REFERENCES `im_messages`(`id`);
