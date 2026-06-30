import { db } from '#database'
import { permissions, roles, rolePermissions } from '#schema'
import { generateId } from '#server-utils/id'

const seedPermissions = [
  // ── 客户 ──
  { code: 'customer:read', name: '查看客户', resource: '客户', action: '查看' },
  { code: 'customer:create', name: '新增客户', resource: '客户', action: '新增' },
  { code: 'customer:edit', name: '编辑客户', resource: '客户', action: '编辑' },
  { code: 'customer:delete', name: '删除客户', resource: '客户', action: '删除' },
  { code: 'customer:transfer', name: '转移客户', resource: '客户', action: '转移' },
  // ── 商机 ──
  { code: 'opportunity:read', name: '查看商机', resource: '商机', action: '查看' },
  { code: 'opportunity:create', name: '新增商机', resource: '商机', action: '新增' },
  { code: 'opportunity:edit', name: '编辑商机', resource: '商机', action: '编辑' },
  { code: 'opportunity:delete', name: '删除商机', resource: '商机', action: '删除' },
  { code: 'opportunity:transfer', name: '转移商机', resource: '商机', action: '转移' },
  // ── 联系人 ──
  { code: 'contact:read', name: '查看联系人', resource: '联系人', action: '查看' },
  { code: 'contact:create', name: '新增联系人', resource: '联系人', action: '新增' },
  { code: 'contact:edit', name: '编辑联系人', resource: '联系人', action: '编辑' },
  { code: 'contact:delete', name: '删除联系人', resource: '联系人', action: '删除' },
  // ── 跟进记录 ──
  { code: 'follow-up:read', name: '查看跟进记录', resource: '跟进记录', action: '查看' },
  { code: 'follow-up:create', name: '新增跟进记录', resource: '跟进记录', action: '新增' },
  { code: 'follow-up:edit', name: '编辑跟进记录', resource: '跟进记录', action: '编辑' },
  { code: 'follow-up:delete', name: '删除跟进记录', resource: '跟进记录', action: '删除' },
  // ── 产品 ──
  { code: 'product:read', name: '查看产品', resource: '产品', action: '查看' },
  { code: 'product:create', name: '新增产品', resource: '产品', action: '新增' },
  { code: 'product:edit', name: '编辑产品', resource: '产品', action: '编辑' },
  { code: 'product:delete', name: '删除产品', resource: '产品', action: '删除' },
  // ── 产品分类 ──
  { code: 'product-category:read', name: '查看产品分类', resource: '产品分类', action: '查看' },
  { code: 'product-category:create', name: '新增产品分类', resource: '产品分类', action: '新增' },
  { code: 'product-category:edit', name: '编辑产品分类', resource: '产品分类', action: '编辑' },
  { code: 'product-category:delete', name: '删除产品分类', resource: '产品分类', action: '删除' },
  // ── 合同 ──
  { code: 'contract:read', name: '查看合同', resource: '合同', action: '查看' },
  { code: 'contract:create', name: '新增合同', resource: '合同', action: '新增' },
  { code: 'contract:edit', name: '编辑合同', resource: '合同', action: '编辑' },
  { code: 'contract:delete', name: '删除合同', resource: '合同', action: '删除' },
  { code: 'contract:approve', name: '审批合同', resource: '合同', action: '审批' },
  { code: 'contract:reject', name: '驳回合同', resource: '合同', action: '驳回' },
  { code: 'contract:transfer', name: '转移合同', resource: '合同', action: '转移' },
  { code: 'contract:manage', name: '管理合同模板', resource: '合同', action: '管理' },
  // ── 报价 ──
  { code: 'quote:read', name: '查看报价', resource: '报价', action: '查看' },
  { code: 'quote:create', name: '新增报价', resource: '报价', action: '新增' },
  { code: 'quote:edit', name: '编辑报价', resource: '报价', action: '编辑' },
  { code: 'quote:delete', name: '删除报价', resource: '报价', action: '删除' },
  { code: 'quote:export-pdf', name: '导出报价PDF', resource: '报价', action: '导出PDF' },
  // ── 项目 ──
  { code: 'project:read', name: '查看项目', resource: '项目', action: '查看' },
  { code: 'project:create', name: '新增项目', resource: '项目', action: '新增' },
  { code: 'project:edit', name: '编辑项目', resource: '项目', action: '编辑' },
  { code: 'project:delete', name: '删除项目', resource: '项目', action: '删除' },
  { code: 'project:manage', name: '管理项目模板', resource: '项目', action: '管理' },
  // ── 任务 ──
  { code: 'task:read', name: '查看任务', resource: '任务', action: '查看' },
  { code: 'task:create', name: '新增任务', resource: '任务', action: '新增' },
  { code: 'task:edit', name: '编辑任务', resource: '任务', action: '编辑' },
  { code: 'task:delete', name: '删除任务', resource: '任务', action: '删除' },
  // ── 里程碑 ──
  { code: 'milestone:read', name: '查看里程碑', resource: '里程碑', action: '查看' },
  { code: 'milestone:create', name: '新增里程碑', resource: '里程碑', action: '新增' },
  { code: 'milestone:edit', name: '编辑里程碑', resource: '里程碑', action: '编辑' },
  { code: 'milestone:delete', name: '删除里程碑', resource: '里程碑', action: '删除' },
  // ── 交付物 ──
  { code: 'deliverable:read', name: '查看交付物', resource: '交付物', action: '查看' },
  { code: 'deliverable:create', name: '新增交付物', resource: '交付物', action: '新增' },
  { code: 'deliverable:edit', name: '编辑交付物', resource: '交付物', action: '编辑' },
  { code: 'deliverable:delete', name: '删除交付物', resource: '交付物', action: '删除' },
  // ── 风险 ──
  { code: 'risk:read', name: '查看风险', resource: '风险', action: '查看' },
  { code: 'risk:create', name: '新增风险', resource: '风险', action: '新增' },
  { code: 'risk:edit', name: '编辑风险', resource: '风险', action: '编辑' },
  { code: 'risk:delete', name: '删除风险', resource: '风险', action: '删除' },
  // ── 预算 ──
  { code: 'budget:read', name: '查看预算', resource: '预算', action: '查看' },
  { code: 'budget:create', name: '新增预算', resource: '预算', action: '新增' },
  { code: 'budget:edit', name: '编辑预算', resource: '预算', action: '编辑' },
  { code: 'budget:delete', name: '删除预算', resource: '预算', action: '删除' },
  // ── 工时 ──
  { code: 'time-log:read', name: '查看工时', resource: '工时', action: '查看' },
  { code: 'time-log:create', name: '新增工时', resource: '工时', action: '新增' },
  { code: 'time-log:edit', name: '编辑工时', resource: '工时', action: '编辑' },
  { code: 'time-log:delete', name: '删除工时', resource: '工时', action: '删除' },
  // ── 评论 ──
  { code: 'comment:read', name: '查看评论', resource: '评论', action: '查看' },
  { code: 'comment:create', name: '新增评论', resource: '评论', action: '新增' },
  { code: 'comment:edit', name: '编辑评论', resource: '评论', action: '编辑' },
  { code: 'comment:delete', name: '删除评论', resource: '评论', action: '删除' },
  // ── 提成 ──
  { code: 'commission:read', name: '查看提成', resource: '提成', action: '查看' },
  { code: 'commission:create', name: '计算提成', resource: '提成', action: '计算' },
  { code: 'commission:edit', name: '编辑提成', resource: '提成', action: '编辑' },
  { code: 'commission:delete', name: '删除提成', resource: '提成', action: '删除' },
  { code: 'commission:approve', name: '审批提成', resource: '提成', action: '审批' },
  { code: 'commission:reject', name: '驳回提成', resource: '提成', action: '驳回' },
  { code: 'commission:adjust', name: '调整提成', resource: '提成', action: '调整' },
  { code: 'commission:manage', name: '管理提成规则', resource: '提成', action: '管理' },
  // ── 提成规则 ──
  { code: 'commission-rule:read', name: '查看提成规则', resource: '提成规则', action: '查看' },
  { code: 'commission-rule:create', name: '新增提成规则', resource: '提成规则', action: '新增' },
  { code: 'commission-rule:edit', name: '编辑提成规则', resource: '提成规则', action: '编辑' },
  { code: 'commission-rule:delete', name: '删除提成规则', resource: '提成规则', action: '删除' },
  // ── 提成发放 ──
  { code: 'commission-payout:read', name: '查看提成发放', resource: '提成发放', action: '查看' },
  { code: 'commission-payout:create', name: '新增提成发放', resource: '提成发放', action: '新增' },
  { code: 'commission-payout:edit', name: '编辑提成发放', resource: '提成发放', action: '编辑' },
  { code: 'commission-payout:delete', name: '删除提成发放', resource: '提成发放', action: '删除' },
  { code: 'commission-payout:confirm', name: '确认提成发放', resource: '提成发放', action: '确认' },
  // ── 财务 ──
  { code: 'finance:read', name: '查看财务', resource: '财务', action: '查看' },
  { code: 'finance:create', name: '创建财务记录', resource: '财务', action: '创建' },
  { code: 'finance:edit', name: '编辑财务记录', resource: '财务', action: '编辑' },
  { code: 'finance:delete', name: '删除财务记录', resource: '财务', action: '删除' },
  { code: 'finance:manage', name: '管理财务设置', resource: '财务', action: '管理' },
  { code: 'finance:approve', name: '审批报销', resource: '财务', action: '审批' },
  // ── 报销 ──
  { code: 'reimbursement:read', name: '查看报销', resource: '报销', action: '查看' },
  { code: 'reimbursement:create', name: '新增报销', resource: '报销', action: '新增' },
  { code: 'reimbursement:edit', name: '编辑报销', resource: '报销', action: '编辑' },
  { code: 'reimbursement:delete', name: '删除报销', resource: '报销', action: '删除' },
  { code: 'reimbursement:approve', name: '审批报销', resource: '报销', action: '审批' },
  { code: 'reimbursement:reject', name: '驳回报销', resource: '报销', action: '驳回' },
  { code: 'reimbursement:pay', name: '报销打款', resource: '报销', action: '打款' },
  // ── 发票 ──
  { code: 'invoice:read', name: '查看发票', resource: '发票', action: '查看' },
  { code: 'invoice:create', name: '新增发票', resource: '发票', action: '新增' },
  { code: 'invoice:edit', name: '编辑发票', resource: '发票', action: '编辑' },
  { code: 'invoice:delete', name: '删除发票', resource: '发票', action: '删除' },
  { code: 'invoice:void', name: '作废发票', resource: '发票', action: '作废' },
  // ── 付款记录 ──
  { code: 'payment:read', name: '查看付款', resource: '付款', action: '查看' },
  { code: 'payment:create', name: '新增付款', resource: '付款', action: '新增' },
  { code: 'payment:edit', name: '编辑付款', resource: '付款', action: '编辑' },
  { code: 'payment:delete', name: '删除付款', resource: '付款', action: '删除' },
  // ── 付款计划 ──
  { code: 'payment-plan:read', name: '查看付款计划', resource: '付款计划', action: '查看' },
  { code: 'payment-plan:create', name: '新增付款计划', resource: '付款计划', action: '新增' },
  { code: 'payment-plan:edit', name: '编辑付款计划', resource: '付款计划', action: '编辑' },
  { code: 'payment-plan:delete', name: '删除付款计划', resource: '付款计划', action: '删除' },
  // ── 进销存 ──
  { code: 'inventory:read', name: '查看进销存', resource: '进销存', action: '查看' },
  { code: 'inventory:create', name: '新增出入库', resource: '进销存', action: '创建' },
  { code: 'inventory:edit', name: '编辑出入库', resource: '进销存', action: '编辑' },
  { code: 'inventory:delete', name: '删除出入库', resource: '进销存', action: '删除' },
  { code: 'inventory:adjust', name: '库存盘点调整', resource: '进销存', action: '调整' },
  // ── 仓库 ──
  { code: 'warehouse:read', name: '查看仓库', resource: '仓库', action: '查看' },
  { code: 'warehouse:create', name: '新增仓库', resource: '仓库', action: '新增' },
  { code: 'warehouse:edit', name: '编辑仓库', resource: '仓库', action: '编辑' },
  { code: 'warehouse:delete', name: '删除仓库', resource: '仓库', action: '删除' },
  // ── 采购 ──
  { code: 'purchase-order:read', name: '查看采购单', resource: '采购单', action: '查看' },
  { code: 'purchase-order:create', name: '新增采购单', resource: '采购单', action: '新增' },
  { code: 'purchase-order:edit', name: '编辑采购单', resource: '采购单', action: '编辑' },
  { code: 'purchase-order:delete', name: '删除采购单', resource: '采购单', action: '删除' },
  { code: 'purchase-order:approve', name: '审批采购单', resource: '采购单', action: '审批' },
  // ── 供应商 ──
  { code: 'supplier:read', name: '查看供应商', resource: '供应商', action: '查看' },
  { code: 'supplier:create', name: '新增供应商', resource: '供应商', action: '新增' },
  { code: 'supplier:edit', name: '编辑供应商', resource: '供应商', action: '编辑' },
  { code: 'supplier:delete', name: '删除供应商', resource: '供应商', action: '删除' },
  // ── 对账 ──
  { code: 'reconciliation:read', name: '查看对账', resource: '对账', action: '查看' },
  { code: 'reconciliation:create', name: '新增对账', resource: '对账', action: '新增' },
  { code: 'reconciliation:edit', name: '编辑对账', resource: '对账', action: '编辑' },
  { code: 'reconciliation:delete', name: '删除对账', resource: '对账', action: '删除' },
  { code: 'reconciliation:confirm', name: '确认对账', resource: '对账', action: '确认' },
  // ── 分包 ──
  { code: 'subcontract:read', name: '查看分包', resource: '分包', action: '查看' },
  { code: 'subcontract:create', name: '新增分包', resource: '分包', action: '新增' },
  { code: 'subcontract:edit', name: '编辑分包', resource: '分包', action: '编辑' },
  { code: 'subcontract:delete', name: '删除分包', resource: '分包', action: '删除' },
  // ── 分包方 ──
  { code: 'subcontract-party:read', name: '查看分包方', resource: '分包方', action: '查看' },
  { code: 'subcontract-party:create', name: '新增分包方', resource: '分包方', action: '新增' },
  { code: 'subcontract-party:edit', name: '编辑分包方', resource: '分包方', action: '编辑' },
  { code: 'subcontract-party:delete', name: '删除分包方', resource: '分包方', action: '删除' },
  // ── 待办 ──
  { code: 'todo:read', name: '查看待办', resource: '待办', action: '查看' },
  { code: 'todo:create', name: '新增待办', resource: '待办', action: '新增' },
  { code: 'todo:edit', name: '编辑待办', resource: '待办', action: '编辑' },
  { code: 'todo:delete', name: '删除待办', resource: '待办', action: '删除' },
  // ── 附件 ──
  { code: 'attachment:read', name: '查看附件', resource: '附件', action: '查看' },
  { code: 'attachment:create', name: '上传附件', resource: '附件', action: '上传' },
  { code: 'attachment:edit', name: '编辑附件', resource: '附件', action: '编辑' },
  { code: 'attachment:delete', name: '删除附件', resource: '附件', action: '删除' },
  // ── 标签 ──
  { code: 'tag:read', name: '查看标签', resource: '标签', action: '查看' },
  { code: 'tag:create', name: '新增标签', resource: '标签', action: '新增' },
  { code: 'tag:edit', name: '编辑标签', resource: '标签', action: '编辑' },
  { code: 'tag:delete', name: '删除标签', resource: '标签', action: '删除' },
  { code: 'tag:manage', name: '管理标签', resource: '标签', action: '管理' },
  // ── 字典 ──
  { code: 'dict:read', name: '查看字典', resource: '字典', action: '查看' },
  { code: 'dict:edit', name: '编辑字典', resource: '字典', action: '编辑' },
  { code: 'dict:manage', name: '管理字典', resource: '字典', action: '管理' },
  // ── 通知 ──
  { code: 'notification:read', name: '查看通知', resource: '通知', action: '查看' },
  { code: 'notification:delete', name: '删除通知', resource: '通知', action: '删除' },
  // ── 用户 ──
  { code: 'user:read', name: '查看用户', resource: '用户', action: '查看' },
  { code: 'user:create', name: '新增用户', resource: '用户', action: '新增' },
  { code: 'user:edit', name: '编辑用户', resource: '用户', action: '编辑' },
  { code: 'user:delete', name: '删除用户', resource: '用户', action: '删除' },
  { code: 'user:manage', name: '管理用户', resource: '用户', action: '管理' },
  // ── 角色 ──
  { code: 'role:read', name: '查看角色', resource: '角色', action: '查看' },
  { code: 'role:create', name: '新增角色', resource: '角色', action: '新增' },
  { code: 'role:edit', name: '编辑角色', resource: '角色', action: '编辑' },
  { code: 'role:delete', name: '删除角色', resource: '角色', action: '删除' },
  { code: 'role:manage', name: '管理角色权限', resource: '角色', action: '管理' },
  // ── 部门 ──
  { code: 'department:read', name: '查看部门', resource: '部门', action: '查看' },
  { code: 'department:create', name: '新增部门', resource: '部门', action: '新增' },
  { code: 'department:edit', name: '编辑部门', resource: '部门', action: '编辑' },
  { code: 'department:delete', name: '删除部门', resource: '部门', action: '删除' },
  { code: 'department:manage', name: '管理部门', resource: '部门', action: '管理' },
  // ── 系统 ──
  { code: 'system:read', name: '查看系统配置', resource: '系统', action: '查看' },
  { code: 'system:edit', name: '编辑系统配置', resource: '系统', action: '编辑' },
  { code: 'system:manage', name: '管理系统', resource: '系统', action: '管理' },
  { code: 'system:config', name: '修改系统配置', resource: '系统', action: '配置' },
  { code: 'system:backup', name: '管理备份', resource: '系统', action: '备份' },
  { code: 'system:logs', name: '查看日志', resource: '系统', action: '日志' },
  // ── AI ──
  { code: 'ai:read', name: '查看AI配置', resource: 'AI', action: '查看' },
  { code: 'ai:manage', name: '管理AI', resource: 'AI', action: '管理' },
]

const seedRoles = [
  { code: 'admin', name: '管理员', description: '系统管理员，拥有全部权限', isSystem: true },
  { code: 'sales_manager', name: '销售负责人', description: '管理全部销售业务数据', isSystem: true },
  { code: 'sales_member', name: '销售成员', description: '仅管理自己负责的数据', isSystem: true },
  { code: 'finance', name: '财务', description: '合同/提成/回款管理，其余只读', isSystem: true },
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

  /** 将权限码列表转为 permId 列表（过滤不存在的码） */
  function resolvePermIds(codes: string[]): string[] {
    const ids: string[] = []
    for (const c of codes) {
      const pid = permMap[c]
      if (pid) ids.push(pid)
    }
    return ids
  }

  /** 批量插入角色-权限关联 */
  async function assignPerms(roleCode: string, codes: string[]) {
    const roleId = roleMap[roleCode]
    if (!roleId) return
    for (const permId of resolvePermIds(codes)) {
      await db.insert(rolePermissions).values({ roleId, permissionId: permId })
    }
  }

  // ── admin: 全部权限 ──
  await assignPerms('admin', Object.keys(permMap))

  // ── sales_manager: 业务模块全部 + 财务/提成只读 + 系统管理 + 查看用户 ──
  const salesMgrCodes = [
    // 客户/商机/联系人/跟进
    'customer:read', 'customer:create', 'customer:edit', 'customer:delete', 'customer:transfer',
    'opportunity:read', 'opportunity:create', 'opportunity:edit', 'opportunity:delete', 'opportunity:transfer',
    'contact:read', 'contact:create', 'contact:edit', 'contact:delete',
    'follow-up:read', 'follow-up:create', 'follow-up:edit', 'follow-up:delete',
    // 产品
    'product:read', 'product:create', 'product:edit', 'product:delete',
    'product-category:read', 'product-category:create', 'product-category:edit', 'product-category:delete',
    // 合同
    'contract:read', 'contract:create', 'contract:edit', 'contract:delete',
    'contract:approve', 'contract:reject', 'contract:transfer', 'contract:manage',
    // 报价
    'quote:read', 'quote:create', 'quote:edit', 'quote:delete', 'quote:export-pdf',
    // 项目/任务/里程碑/交付物/风险/预算/工时
    'project:read', 'project:create', 'project:edit', 'project:delete', 'project:manage',
    'task:read', 'task:create', 'task:edit', 'task:delete',
    'milestone:read', 'milestone:create', 'milestone:edit', 'milestone:delete',
    'deliverable:read', 'deliverable:create', 'deliverable:edit', 'deliverable:delete',
    'risk:read', 'risk:create', 'risk:edit', 'risk:delete',
    'budget:read', 'budget:create', 'budget:edit', 'budget:delete',
    'time-log:read', 'time-log:create', 'time-log:edit', 'time-log:delete',
    'comment:read', 'comment:create', 'comment:edit', 'comment:delete',
    // 进销存/仓库/采购/供应商
    'inventory:read', 'inventory:create', 'inventory:edit', 'inventory:delete', 'inventory:adjust',
    'warehouse:read', 'warehouse:create', 'warehouse:edit', 'warehouse:delete',
    'purchase-order:read', 'purchase-order:create', 'purchase-order:edit', 'purchase-order:delete', 'purchase-order:approve',
    'supplier:read', 'supplier:create', 'supplier:edit', 'supplier:delete',
    // 分包
    'subcontract:read', 'subcontract:create', 'subcontract:edit', 'subcontract:delete',
    'subcontract-party:read', 'subcontract-party:create', 'subcontract-party:edit', 'subcontract-party:delete',
    // 提成/财务只读
    'commission:read', 'commission-rule:read', 'commission-payout:read',
    'finance:read', 'reimbursement:read',
    'invoice:read', 'payment:read', 'payment-plan:read', 'reconciliation:read',
    // 待办/附件/标签/通知/评论
    'todo:read', 'todo:create', 'todo:edit', 'todo:delete',
    'attachment:read', 'attachment:create', 'attachment:edit', 'attachment:delete',
    'tag:read', 'tag:create', 'tag:edit', 'tag:delete', 'tag:manage',
    'notification:read', 'notification:delete',
    'dict:read', 'dict:edit', 'dict:manage',
    // 用户查看 + 系统管理
    'user:read',
    'system:read', 'system:manage', 'system:config', 'system:backup', 'system:logs',
    // AI
    'ai:read',
  ]
  await assignPerms('sales_manager', salesMgrCodes)

  // ── sales_member: 看自己的 + 部分创建/编辑 ──
  const salesMemberCodes = [
    // 只读: 产品、合同、项目、报价、供应商、仓库、进销存
    'customer:read', 'customer:create', 'customer:edit',
    'opportunity:read', 'opportunity:create', 'opportunity:edit',
    'contact:read', 'contact:create', 'contact:edit',
    'follow-up:read', 'follow-up:create', 'follow-up:edit',
    'product:read',
    'product-category:read',
    'contract:read', 'contract:create',
    'quote:read', 'quote:create', 'quote:edit',
    'project:read',
    'task:read', 'task:create', 'task:edit',
    'milestone:read',
    'deliverable:read',
    'risk:read',
    'budget:read',
    'time-log:read', 'time-log:create',
    'comment:read', 'comment:create',
    'inventory:read',
    'warehouse:read',
    'purchase-order:read',
    'supplier:read',
    'subcontract:read',
    'subcontract-party:read',
    'commission:read',
    'commission-rule:read',
    'commission-payout:read',
    'finance:read',
    'reimbursement:read', 'reimbursement:create',
    'invoice:read',
    'payment:read',
    'payment-plan:read',
    'reconciliation:read',
    'todo:read', 'todo:create', 'todo:edit', 'todo:delete',
    'attachment:read', 'attachment:create',
    'tag:read',
    'notification:read', 'notification:delete',
    'dict:read',
    'ai:read',
  ]
  await assignPerms('sales_member', salesMemberCodes)

  // ── finance: 财务全部 + 合同/提成/发票/付款/对账 + 业务只读 ──
  const financeCodes = [
    // 财务全部
    'finance:read', 'finance:create', 'finance:edit', 'finance:delete', 'finance:manage', 'finance:approve',
    'reimbursement:read', 'reimbursement:create', 'reimbursement:edit', 'reimbursement:delete',
    'reimbursement:approve', 'reimbursement:reject', 'reimbursement:pay',
    // 提成
    'commission:read', 'commission:create', 'commission:edit', 'commission:delete',
    'commission:approve', 'commission:reject', 'commission:adjust', 'commission:manage',
    'commission-rule:read', 'commission-rule:create', 'commission-rule:edit', 'commission-rule:delete',
    'commission-payout:read', 'commission-payout:create', 'commission-payout:edit',
    'commission-payout:delete', 'commission-payout:confirm',
    // 合同只读+审批
    'contract:read', 'contract:approve', 'contract:reject',
    'quote:read',
    // 发票/付款/对账
    'invoice:read', 'invoice:create', 'invoice:edit', 'invoice:void',
    'payment:read', 'payment:create', 'payment:edit',
    'payment-plan:read', 'payment-plan:create',
    'reconciliation:read', 'reconciliation:create', 'reconciliation:edit', 'reconciliation:confirm',
    // 业务只读
    'customer:read',
    'opportunity:read',
    'contact:read',
    'follow-up:read',
    'product:read',
    'product-category:read',
    'project:read',
    'task:read',
    'milestone:read',
    'deliverable:read',
    'risk:read',
    'budget:read',
    'time-log:read',
    'comment:read',
    'inventory:read',
    'warehouse:read',
    'purchase-order:read', 'purchase-order:approve',
    'supplier:read',
    'subcontract:read',
    'subcontract-party:read',
    'todo:read',
    'attachment:read', 'attachment:create',
    'notification:read', 'notification:delete',
    'dict:read',
    // 系统只读
    'system:read',
    'user:read',
    'role:read',
    'department:read',
    'ai:read',
  ]
  await assignPerms('finance', financeCodes)

  console.log(`[perm-seed] 权限/角色初始化完成 (${seedPermissions.length} 权限, ${seedRoles.length} 角色)`)
})
