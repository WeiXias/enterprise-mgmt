-- 0023: 补 dashboard:view 权限（此前该权限码在种子列表中遗漏）
INSERT INTO permissions (id, code, name, resource, action)
SELECT hex(randomblob(12)), 'dashboard:view', '查看仪表盘', '仪表盘', '查看'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'dashboard:view');

-- admin 自动获得所有权限，此处补上关联
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin' AND p.code = 'dashboard:view'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);

-- 销售负责人
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'sales_manager' AND p.code = 'dashboard:view'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);

-- 销售成员
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'sales_member' AND p.code = 'dashboard:view'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);

-- 财务
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'finance' AND p.code = 'dashboard:view'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);
