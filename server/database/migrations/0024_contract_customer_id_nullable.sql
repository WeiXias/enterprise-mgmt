-- 移除 contracts.customer_id 的 NOT NULL 约束
-- 采购合同不需要关联客户，customer_id 应为可空
-- SQLite 不支持 ALTER TABLE DROP NOT NULL，需重建表

PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_contracts` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `customer_id` text REFERENCES `customers`(`id`),
  `opportunity_id` text REFERENCES `opportunities`(`id`),
  `supplier_id` text REFERENCES `suppliers`(`id`),
  `party_a` text NOT NULL,
  `party_b` text NOT NULL,
  `total_amount` integer NOT NULL DEFAULT 0,
  `payment_method` text,
  `start_date` text,
  `end_date` text,
  `signed_at` text,
  `status` text NOT NULL DEFAULT 'draft',
  `reject_reason` text,
  `approved_by` text REFERENCES `users`(`id`),
  `approved_at` text,
  `owner_user_id` text REFERENCES `users`(`id`),
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `remark` text,
  `content` text,
  `type` text NOT NULL DEFAULT 'sales',
  `direction` text NOT NULL DEFAULT 'income',
  `version` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now')),
  `deleted_at` text
);

INSERT INTO `__new_contracts` SELECT * FROM `contracts`;

DROP TABLE `contracts`;
ALTER TABLE `__new_contracts` RENAME TO `contracts`;

CREATE INDEX `idx_contracts_customer_id` ON `contracts`(`customer_id`);
CREATE INDEX `idx_contracts_opportunity_id` ON `contracts`(`opportunity_id`);
CREATE INDEX `idx_contracts_supplier_id` ON `contracts`(`supplier_id`);
CREATE INDEX `idx_contracts_status` ON `contracts`(`status`);
CREATE INDEX `idx_contracts_owner_user_id` ON `contracts`(`owner_user_id`);
CREATE INDEX `idx_contracts_type` ON `contracts`(`type`);
CREATE INDEX `idx_contracts_deleted_at` ON `contracts`(`deleted_at`);

PRAGMA foreign_keys=ON;
