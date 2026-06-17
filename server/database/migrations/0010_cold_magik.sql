INSERT INTO `subcontracts` (`id`, `code`, `name`, `parent_contract_id`, `subcontract_party_id`, `total_amount`, `tax_rate`, `service_fee`, `status`, `start_date`, `end_date`, `remark`, `created_by`, `created_at`, `updated_at`, `deleted_at`)
SELECT `id`, `code`, `name`, COALESCE(`parent_contract_id`, ''), `subcontract_party_id`, `total_amount`, `tax_rate`, COALESCE(`service_fee`, 0), `status`, `start_date`, `end_date`, `remark`, `created_by`, `created_at`, `updated_at`, `deleted_at`
FROM `contracts` WHERE `contract_type` = 'subcontract';
