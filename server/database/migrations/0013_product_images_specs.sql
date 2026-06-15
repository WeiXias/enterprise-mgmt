CREATE TABLE `product_images` (
  `id` TEXT PRIMARY KEY,
  `product_id` TEXT NOT NULL REFERENCES `products`(`id`),
  `file_name` TEXT NOT NULL,
  `file_path` TEXT NOT NULL,
  `file_size` INTEGER NOT NULL DEFAULT 0,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `uploaded_by` TEXT NOT NULL REFERENCES `users`(`id`),
  `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `product_specs` (
  `id` TEXT PRIMARY KEY,
  `product_id` TEXT NOT NULL REFERENCES `products`(`id`),
  `spec_template` TEXT NOT NULL,
  `spec_key` TEXT NOT NULL,
  `spec_value` TEXT NOT NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
