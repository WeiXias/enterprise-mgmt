import { db } from '#database'
import { permissions, roles, rolePermissions, codeRules } from '#schema'
import { generateId } from '#server-utils/id'

const seedPermissions = [
  { code: 'customer:read', name: '查看客户', resource: '客户', action: '查看' },
  { code: 'customer:create', name: '新增客户', resource: '客户', action: '新增' },
  { code: 'customer:edit', name: '编辑客户', resource: '客户', action: '编辑' },
  { code: 'customer:delete', name: '删除客户', resource: '客户', action: '删除' },
  { code: 'opportunity:read', name: '查看商机', resource: '商机', action: '查看' },
  { code: 'opportunity:create', name: '新增商机', resource: '商机', action: '新增' },
  { code: 'opportunity:edit', name: '编辑商机', resource: '商机', action: '编辑' },
  { code: 'opportunity:delete', name: '删除商机', resource: '商机', action: '删除' },
  { code: 'product:read', name: '查看产品', resource: '产品', action: '查看' },
  { code: 'product:create', name: '新增产品', resource: '产品', action: '新增' },
  { code: 'product:edit', name: '编辑产品', resource: '产品', action: '编辑' },
  { code: 'product:delete', name: '删除产品', resource: '产品', action: '删除' },
  { code: 'contract:read', name: '查看合同', resource: '合同', action: '查看' },
  { code: 'contract:create', name: '新增合同', resource: '合同', action: '新增' },
  { code: 'contract:edit', name: '编辑合同', resource: '合同', action: '编辑' },
  { code: 'contract:delete', name: '删除合同', resource: '合同', action: '删除' },
  { code: 'finance:read', name: '查看财务', resource: '财务', action: '查看' },
  { code: 'finance:create', name: '新增财务', resource: '财务', action: '新增' },
  { code: 'finance:edit', name: '编辑财务', resource: '财务', action: '编辑' },
  { code: 'finance:delete', name: '删除财务', resource: '财务', action: '删除' },
  { code: 'project:read', name: '查看项目', resource: '项目', action: '查看' },
  { code: 'project:create', name: '新增项目', resource: '项目', action: '新增' },
  { code: 'project:edit', name: '编辑项目', resource: '项目', action: '编辑' },
  { code: 'project:delete', name: '删除项目', resource: '项目', action: '删除' },
  { code: 'inventory:read', name: '查看进销存', resource: '进销存', action: '查看' },
  { code: 'inventory:create', name: '新增进销存', resource: '进销存', action: '新增' },
  { code: 'inventory:edit', name: '编辑进销存', resource: '进销存', action: '编辑' },
  { code: 'inventory:delete', name: '删除进销存', resource: '进销存', action: '删除' },
  { code: 'system:manage', name: '系统管理', resource: '系统', action: '管理' },
]

const seedRoles = [
  { code: 'admin', name: '管理员', description: '系统管理员，拥有全部权限', isSystem: 1 },
  { code: 'sales_manager', name: '销售负责人', description: '管理全部销售业务数据', isSystem: 1 },
  { code: 'sales_member', name: '销售成员', description: '仅管理自己负责的数据', isSystem: 1 },
  { code: 'finance', name: '财务', description: '合同/提成/回款管理，其余只读', isSystem: 1 },
]

export default defineNitroPlugin(async () => {
  const existingPerms = await db.select().from(permissions).limit(1)
  if (existingPerms.length > 0) return

  // 插入权限
  const permMap: Record<string, string> = {}
  for (const p of seedPermissions) {
    const id = generateId()
    permMap[p.code] = id
    await db.insert(permissions).values({ id, code: p.code, name: p.name, resource: p.resource, action: p.action })
  }

  // 插入角色
  const roleMap: Record<string, string> = {}
  for (const r of seedRoles) {
    const id = generateId()
    roleMap[r.code] = id
    await db.insert(roles).values({ id, name: r.name, code: r.code, description: r.description, isSystem: r.isSystem, sortOrder: 0 })
  }

  // admin 拥有所有权限
  const adminRoleId = roleMap['admin']
  const allPermIds = Object.values(permMap)
  for (const permId of allPermIds) {
    await db.insert(rolePermissions).values({ roleId: adminRoleId, permissionId: permId })
  }

  // sales_manager: 客户、商机、产品、合同、项目、进销存 的全部；财务查看；系统管理
  const salesMgrPerms = seedPermissions.filter(p =>
    p.code.startsWith('customer:') || p.code.startsWith('opportunity:') ||
    p.code.startsWith('product:') || p.code.startsWith('contract:') ||
    p.code.startsWith('project:') || p.code.startsWith('inventory:') ||
    p.code === 'finance:read' || p.code === 'system:manage'
  ).map(p => permMap[p.code])
  for (const permId of salesMgrPerms) {
    await db.insert(rolePermissions).values({ roleId: roleMap['sales_manager'], permissionId: permId })
  }

  // sales_member: 仅查看权限
  const salesMemberPerms = seedPermissions.filter(p => p.code.endsWith(':read')).map(p => permMap[p.code])
  for (const permId of salesMemberPerms) {
    await db.insert(rolePermissions).values({ roleId: roleMap['sales_member'], permissionId: permId })
  }

  // finance: 财务全部 + 合同/产品/客户的查看
  const financePerms = seedPermissions.filter(p =>
    p.code.startsWith('finance:') || p.code === 'contract:read' ||
    p.code === 'product:read' || p.code === 'customer:read'
  ).map(p => permMap[p.code])
  for (const permId of financePerms) {
    await db.insert(rolePermissions).values({ roleId: roleMap['finance'], permissionId: permId })
  }

  // 编码规则种子
  const existingRules = await db.select().from(codeRules).limit(1)
  if (existingRules.length === 0) {
    const rules = [
      { module: '客户', prefix: 'CUS-', datePart: 'none' as const, seqLength: '4' },
      { module: '商机', prefix: 'OPP-', datePart: 'year_month' as const, seqLength: '4' },
      { module: '合同', prefix: 'CTR-', datePart: 'year_month' as const, seqLength: '4' },
      { module: '项目', prefix: 'PRJ-', datePart: 'year_month' as const, seqLength: '4' },
      { module: '发票', prefix: 'INV-', datePart: 'year_month' as const, seqLength: '4' },
      { module: '采购', prefix: 'PO-', datePart: 'year_month' as const, seqLength: '4' },
    ]
    for (const r of rules) {
      await db.insert(codeRules).values({ id: generateId(), module: r.module, prefix: r.prefix, datePart: r.datePart, seqLength: r.seqLength, currentSeq: '0' })
    }
    console.log(`[perm-seed] 编码规则初始化完成 (${rules.length} 条)`)
  }

  console.log(`[perm-seed] 权限/角色初始化完成 (${seedPermissions.length} 权限, ${seedRoles.length} 角色)`)
})
