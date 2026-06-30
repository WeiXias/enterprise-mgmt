/**
 * 种子数据脚本 (Drizzle ORM 版)
 * 用法: pnpm seed
 *
 * 先通过 drizzle-kit push 自动建表，再插入种子数据。
 * 彻底消除手写 SQL 导致的 schema 不一致。
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from './database/schema/index.js'
import { hashPassword } from './utils/auth.js'
import { generateId } from './utils/id.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db', 'enterprise.db')

// Ensure data dir
const dir = path.dirname(DB_PATH)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

// Remove old DB first (before creating any connection)
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH)

// ====== Create fresh DB with drizzle-kit ======
const { execSync } = await import('child_process')
try {
  execSync('npx drizzle-kit push --force', { stdio: 'pipe', timeout: 30000 })
} catch (e: any) {
  console.error('[seed] drizzle-kit push failed:', e.stderr?.toString() || e.message)
  process.exit(1)
}

// Now create connection after drizzle-kit has created the DB
const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

// ====== Seed Data ======
async function seed() {
  const now = () => new Date().toISOString()

  // 1. Users
  const adminPwd = await hashPassword('admin123')
  const salesMgrPwd = await hashPassword('manager123')
  const salesPwd = await hashPassword('sales123')
  const financePwd = await hashPassword('finance123')

  const roleIds = {
    admin: generateId(),
    salesManager: generateId(),
    salesMember: generateId(),
    finance: generateId(),
  }
  const permIds: Record<string, string> = {}

  const userIds = {
    admin: generateId(),
    salesManager: generateId(),
    salesMember: generateId(),
    finance: generateId(),
  }

  await db.insert(schema.users).values([
    { id: userIds.admin, username: 'admin', password: adminPwd, name: '张管理', role: 'admin', phone: '13800000001', email: 'admin@company.com', status: 'active' },
    { id: userIds.salesManager, username: 'manager', password: salesMgrPwd, name: '李负责人', role: 'sales_manager', phone: '13800000002', email: 'manager@company.com', status: 'active' },
    { id: userIds.salesMember, username: 'sales', password: salesPwd, name: '王销售', role: 'sales_member', phone: '13800000003', email: 'sales@company.com', status: 'active' },
    { id: userIds.finance, username: 'finance', password: financePwd, name: '赵财务', role: 'finance', phone: '13800000004', email: 'finance@company.com', status: 'active' },
  ])
  console.log('4 users created.')

  // 1.5 权限数据
  const permissionDefs = [
    { code: 'customer:view', name: '查看客户', resource: 'customer', action: 'view' },
    { code: 'customer:create', name: '创建客户', resource: 'customer', action: 'create' },
    { code: 'customer:edit', name: '编辑客户', resource: 'customer', action: 'edit' },
    { code: 'customer:delete', name: '删除客户', resource: 'customer', action: 'delete' },
    { code: 'customer:transfer', name: '转交客户', resource: 'customer', action: 'transfer' },
    { code: 'opportunity:view', name: '查看商机', resource: 'opportunity', action: 'view' },
    { code: 'opportunity:create', name: '创建商机', resource: 'opportunity', action: 'create' },
    { code: 'opportunity:edit', name: '编辑商机', resource: 'opportunity', action: 'edit' },
    { code: 'opportunity:delete', name: '删除商机', resource: 'opportunity', action: 'delete' },
    { code: 'contract:view', name: '查看合同', resource: 'contract', action: 'view' },
    { code: 'contract:create', name: '创建合同', resource: 'contract', action: 'create' },
    { code: 'contract:edit', name: '编辑合同', resource: 'contract', action: 'edit' },
    { code: 'contract:delete', name: '删除合同', resource: 'contract', action: 'delete' },
    { code: 'contract:approve', name: '审批合同', resource: 'contract', action: 'approve' },
    { code: 'contract:transfer', name: '转交合同', resource: 'contract', action: 'transfer' },
    { code: 'contract:manage', name: '管理合同模板', resource: 'contract', action: 'manage' },
    { code: 'project:view', name: '查看项目', resource: 'project', action: 'view' },
    { code: 'project:create', name: '创建项目', resource: 'project', action: 'create' },
    { code: 'project:edit', name: '编辑项目', resource: 'project', action: 'edit' },
    { code: 'project:delete', name: '删除项目', resource: 'project', action: 'delete' },
    { code: 'project:manage', name: '管理项目模板', resource: 'project', action: 'manage' },
    { code: 'product:view', name: '查看产品', resource: 'product', action: 'view' },
    { code: 'product:create', name: '创建产品', resource: 'product', action: 'create' },
    { code: 'product:edit', name: '编辑产品', resource: 'product', action: 'edit' },
    { code: 'product:delete', name: '删除产品', resource: 'product', action: 'delete' },
    { code: 'commission:view', name: '查看提成', resource: 'commission', action: 'view' },
    { code: 'commission:approve', name: '审批提成', resource: 'commission', action: 'approve' },
    { code: 'commission:adjust', name: '调整提成', resource: 'commission', action: 'adjust' },
    { code: 'commission:manage', name: '管理提成规则与发放', resource: 'commission', action: 'manage' },
    { code: 'user:create', name: '创建用户', resource: 'user', action: 'create' },
    { code: 'user:edit', name: '编辑用户', resource: 'user', action: 'edit' },
    { code: 'user:delete', name: '删除用户', resource: 'user', action: 'delete' },
    { code: 'user:manage', name: '管理用户（重置密码等）', resource: 'user', action: 'manage' },
    { code: 'department:manage', name: '管理部门结构', resource: 'department', action: 'manage' },
    { code: 'role:manage', name: '管理角色与权限', resource: 'role', action: 'manage' },
    { code: 'ai:manage', name: '管理 AI 设置', resource: 'ai', action: 'manage' },
    { code: 'finance:view', name: '查看财务', resource: 'finance', action: 'view' },
    { code: 'finance:manage', name: '管理财务', resource: 'finance', action: 'manage' },
    { code: 'system:config', name: '系统配置', resource: 'system', action: 'config' },
    { code: 'system:logs', name: '操作日志', resource: 'system', action: 'logs' },
    { code: 'system:backup', name: '数据备份', resource: 'system', action: 'backup' },
  ]
  for (const p of permissionDefs) {
    const permId = generateId()
    permIds[p.code] = permId
    await db.insert(schema.permissions).values({ id: permId, code: p.code, name: p.name, resource: p.resource, action: p.action })
  }
  console.log(`${permissionDefs.length} permissions created.`)

  // 1.6 角色数据
  const roleDefs = [
    { id: roleIds.admin, name: '管理员', code: 'admin', isSystem: true, allPerms: true },
    { id: roleIds.salesMember, name: '销售成员', code: 'sales_member', isSystem: true, allPerms: false, perms: ['customer:view','customer:create','customer:edit','opportunity:view','opportunity:create','opportunity:edit','contract:view','contract:create','project:view','product:view'] },
    { id: roleIds.finance, name: '财务', code: 'finance', isSystem: true, allPerms: false, perms: ['contract:view','contract:approve','commission:view','commission:approve','commission:adjust','commission:manage','finance:view','finance:manage','customer:view','opportunity:view','project:view','product:view'] },
  ]
  for (const r of roleDefs) {
    await db.insert(schema.roles).values({ id: r.id, name: r.name, code: r.code, isSystem: r.isSystem, sortOrder: 0 })
    if (r.allPerms) {
      // 管理员拥有所有权限
      await db.insert(schema.rolePermissions).values(Object.values(permIds).map(permId => ({ roleId: r.id, permissionId: permId })))
    } else if (r.perms) {
      await db.insert(schema.rolePermissions).values(r.perms.map(code => ({ roleId: r.id, permissionId: permIds[code]! })))
    }
  }
  console.log('4 roles + role-permission mappings created.')

  // 1.7 部门数据
  const deptIds = { root: generateId(), sales: generateId(), tech: generateId(), finance: generateId() }
  await db.insert(schema.departments).values([
    { id: deptIds.root, name: '总经办', sortOrder: 0 },
    { id: deptIds.sales, name: '销售部', parentId: deptIds.root, managerId: userIds.salesManager, sortOrder: 1 },
    { id: deptIds.tech, name: '技术部', parentId: deptIds.root, managerId: userIds.admin, sortOrder: 2 },
    { id: deptIds.finance, name: '财务部', parentId: deptIds.root, managerId: userIds.finance, sortOrder: 3 },
  ])
  // 更新用户部门
  await db.update(schema.users).set({ departmentId: deptIds.root, roleId: roleIds.admin }).where(eq(schema.users.id, userIds.admin))
  await db.update(schema.users).set({ departmentId: deptIds.sales, roleId: roleIds.salesManager }).where(eq(schema.users.id, userIds.salesManager))
  await db.update(schema.users).set({ departmentId: deptIds.sales, roleId: roleIds.salesMember }).where(eq(schema.users.id, userIds.salesMember))
  await db.update(schema.users).set({ departmentId: deptIds.finance, roleId: roleIds.finance }).where(eq(schema.users.id, userIds.finance))
  console.log('4 departments created.')

  // 2. Tags
  const tagData = [
    { id: generateId(), name: '重点客户', color: '#DC2626' },
    { id: generateId(), name: '长期合作', color: '#0D9488' },
    { id: generateId(), name: '新客户', color: '#2563EB' },
  ]
  await db.insert(schema.tags).values(tagData)
  console.log('3 tags created.')

  // 3. Customers
  const customerData = [
    { id: generateId(), name: '星辰科技有限公司', industry: '人工智能', registeredAddress: '北京市海淀区中关村', officeAddress: '北京市朝阳区望京', ownerUserId: userIds.salesMember, status: 'intentional' as const },
    { id: generateId(), name: '远航物流集团', industry: '物流', registeredAddress: '上海市浦东新区', officeAddress: '上海市浦东新区', ownerUserId: userIds.salesManager, status: 'closed' as const },
    { id: generateId(), name: '明辉教育科技', industry: '教育', registeredAddress: '广州市天河区', officeAddress: '广州市海珠区', ownerUserId: userIds.salesMember, status: 'potential' as const },
    { id: generateId(), name: '锦程金融控股', industry: '金融', registeredAddress: '深圳市南山区', officeAddress: '', ownerUserId: userIds.admin, status: 'intentional' as const },
    { id: generateId(), name: '万象电商平台', industry: '电子商务', registeredAddress: '杭州市余杭区', officeAddress: '', ownerUserId: userIds.salesManager, status: 'closed' as const },
  ]
  for (const c of customerData) await db.insert(schema.customers).values(c)
  // Customer tags
  if (schema.customerTags) {
    await db.insert(schema.customerTags).values({ customerId: customerData[0]!.id, tagId: tagData[0]!.id })
    await db.insert(schema.customerTags).values({ customerId: customerData[1]!.id, tagId: tagData[1]!.id })
    await db.insert(schema.customerTags).values({ customerId: customerData[2]!.id, tagId: tagData[2]!.id })
  }
  console.log('5 customers created.')

  // 4. Contacts
  const contactIds = [generateId(), generateId(), generateId()]
  if (schema.contacts) {
    await db.insert(schema.contacts).values([
      { id: contactIds[0]!, customerId: customerData[0]!.id, name: '陈经理', position: '技术总监', phone: '13900000001', email: 'c@company.com', isPrimary: true },
      { id: contactIds[1]!, customerId: customerData[1]!.id, name: '刘主管', position: '运营经理', phone: '13900000011', email: 'l@company.com', isPrimary: true },
      { id: contactIds[2]!, customerId: customerData[2]!.id, name: '周总监', position: '财务总监', phone: '13900000021', email: 'z@company.com', isPrimary: false },
    ])
  }
  console.log('3 contacts created.')

  // 5. Product Categories & Products
  const catIds = { software: generateId(), hardware: generateId() }
  if (schema.productCategories) {
    await db.insert(schema.productCategories).values([
      { id: catIds.software, name: '软件产品', sort: '0' },
      { id: catIds.hardware, name: '硬件设备', sort: '1' },
    ])
  }
  const productData = [
    { id: generateId(), name: '企业管理系统 V3', code: 'SW-001', categoryId: catIds.software, standardPrice: 98000, costPrice: 45000, status: 'on_sale' as const },
    { id: generateId(), name: '数据分析平台', code: 'SW-002', categoryId: catIds.software, standardPrice: 68000, costPrice: 30000, status: 'on_sale' as const },
    { id: generateId(), name: '智能客服系统', code: 'SW-003', categoryId: catIds.software, standardPrice: 128000, costPrice: 60000, status: 'on_sale' as const },
    { id: generateId(), name: '云服务器 ECS-4C', code: 'HW-001', categoryId: catIds.hardware, standardPrice: 36000, costPrice: 18000, status: 'on_sale' as const },
    { id: generateId(), name: '网络安全网关', code: 'HW-002', categoryId: catIds.hardware, standardPrice: 85000, costPrice: 42000, status: 'on_sale' as const },
  ]
  for (const p of productData) await db.insert(schema.products).values(p)
  console.log('5 products + 2 categories created.')

  // 6. Opportunities
  const oppData = [
    { id: generateId(), name: '星辰科技-ERP系统', customerId: customerData[0]!.id, ownerUserId: userIds.salesMember, estimatedAmount: 150000, status: 'business_negotiation' as const },
    { id: generateId(), name: '锦程金融-风控平台', customerId: customerData[3]!.id, ownerUserId: userIds.admin, estimatedAmount: 280000, status: 'proposal_submitted' as const },
    { id: generateId(), name: '明辉教育-在线课堂', customerId: customerData[2]!.id, ownerUserId: userIds.salesMember, estimatedAmount: 90000, status: 'initial_contact' as const },
  ]
  for (const o of oppData) await db.insert(schema.opportunities).values(o)
  console.log('3 opportunities created.')

  // 7. Contracts
  const contractData = [
    { id: generateId(), code: 'HT-2026-001', name: '远航物流-ERP实施合同', customerId: customerData[1]!.id, partyA: '远航物流集团', partyB: '我方公司', totalAmount: 200000, status: 'approved' as const, createdBy: userIds.salesManager },
    { id: generateId(), code: 'HT-2026-002', name: '万象电商-数据分析合同', customerId: customerData[4]!.id, partyA: '万象电商平台', partyB: '我方公司', totalAmount: 120000, status: 'in_progress' as const, createdBy: userIds.salesManager },
  ]
  for (const c of contractData) await db.insert(schema.contracts).values(c)

  // Payment plans
  const planIds = [generateId(), generateId(), generateId(), generateId()]
  if (schema.paymentPlans) {
    await db.insert(schema.paymentPlans).values([
      { id: planIds[0]!, contractId: contractData[0]!.id, amount: 100000, planDate: '2026-07-15', status: 'pending' },
      { id: planIds[1]!, contractId: contractData[0]!.id, amount: 100000, planDate: '2026-09-15', status: 'pending' },
      { id: planIds[2]!, contractId: contractData[1]!.id, amount: 60000, planDate: '2026-06-30', status: 'pending' },
      { id: planIds[3]!, contractId: contractData[1]!.id, amount: 60000, planDate: '2026-08-30', status: 'paid' },
    ])
  }
  // Payments
  if (schema.payments) {
    await db.insert(schema.payments).values([
      { id: generateId(), contractId: contractData[0]!.id, paymentPlanId: planIds[0]!, amount: 50000, paymentDate: '2026-07-10', paymentMethod: 'bank_transfer', createdBy: userIds.salesManager },
      { id: generateId(), contractId: contractData[1]!.id, paymentPlanId: planIds[2]!, amount: 60000, paymentDate: '2026-06-28', paymentMethod: 'bank_transfer', createdBy: userIds.salesManager },
    ])
  }
  console.log('2 contracts + 4 payment plans + 2 payments created.')

  // 8. Projects
  const projectData = [
    { id: generateId(), name: '远航ERP-一期部署', contractId: contractData[0]!.id, ownerUserId: userIds.salesManager, budget: 160000, status: 'in_progress' as const },
    { id: generateId(), name: '万象电商-数据中台', contractId: contractData[1]!.id, ownerUserId: userIds.salesMember, budget: 90000, status: 'not_started' as const },
  ]
  for (const p of projectData) await db.insert(schema.projects).values(p)
  // Project members
  if (schema.projectMembers) {
    await db.insert(schema.projectMembers).values([
      { id: generateId(), projectId: projectData[0]!.id, userId: userIds.salesManager, role: 'leader' },
      { id: generateId(), projectId: projectData[0]!.id, userId: userIds.salesMember, role: 'member' },
      { id: generateId(), projectId: projectData[1]!.id, userId: userIds.salesMember, role: 'leader' },
    ])
  }
  // Tasks
  if (schema.tasks) {
    await db.insert(schema.tasks).values([
      { id: generateId(), projectId: projectData[0]!.id, name: '需求调研', assigneeId: userIds.salesMember, priority: 'high', status: 'completed' },
      { id: generateId(), projectId: projectData[0]!.id, name: '系统架构设计', assigneeId: userIds.salesManager, priority: 'high', status: 'in_progress' },
      { id: generateId(), projectId: projectData[0]!.id, name: '数据库搭建', assigneeId: userIds.salesMember, priority: 'medium', status: 'todo' },
      { id: generateId(), projectId: projectData[1]!.id, name: '数据源接入', assigneeId: userIds.salesMember, priority: 'medium', status: 'todo' },
      { id: generateId(), projectId: projectData[1]!.id, name: '报表模板设计', assigneeId: null as unknown as string, priority: 'low', status: 'todo' },
    ])
  }
  // Deliverables
  if (schema.deliverables) {
    await db.insert(schema.deliverables).values([
      { id: generateId(), projectId: projectData[0]!.id, name: '需求文档 V1.0', status: 'submitted' },
      { id: generateId(), projectId: projectData[0]!.id, name: '架构设计图', status: 'pending' },
    ])
  }
  // Project templates
  if (schema.projectTemplates) {
    await db.insert(schema.projectTemplates).values([
      {
        id: generateId(),
        name: 'IT实施项目',
        category: 'it_implementation',
        phases: JSON.stringify([
          { name: '需求调研', tasks: [{ name: '需求访谈', priority: 'high' }, { name: '需求文档编写', priority: 'high' }, { name: '需求评审确认', priority: 'high' }] },
          { name: '方案设计', tasks: [{ name: '技术方案设计', priority: 'high' }, { name: '详细设计文档', priority: 'medium' }] },
          { name: '开发实施', tasks: [{ name: '环境搭建', priority: 'high' }, { name: '功能开发', priority: 'high' }, { name: '单元测试', priority: 'medium' }, { name: '集成测试', priority: 'medium' }] },
          { name: '上线部署', tasks: [{ name: '上线检查清单', priority: 'high' }, { name: '生产部署', priority: 'high' }, { name: '上线验证', priority: 'high' }] },
          { name: '项目验收', tasks: [{ name: '验收测试', priority: 'high' }, { name: '文档交付', priority: 'medium' }, { name: '培训交接', priority: 'medium' }] },
        ]),
      },
      {
        id: generateId(),
        name: '运维服务项目',
        category: 'om_service',
        phases: JSON.stringify([
          { name: '服务启动', tasks: [{ name: '服务启动确认', priority: 'high' }, { name: '资源配置', priority: 'high' }] },
          { name: '日常运维', tasks: [{ name: '系统监控', priority: 'high' }, { name: '故障处理', priority: 'medium' }, { name: '性能优化', priority: 'medium' }] },
          { name: '巡检报告', tasks: [{ name: '定期巡检', priority: 'medium' }, { name: '巡检报告输出', priority: 'medium' }] },
          { name: '应急响应', tasks: [{ name: '应急预案执行', priority: 'high' }] },
        ]),
      },
      {
        id: generateId(),
        name: '咨询服务项目',
        category: 'consulting',
        phases: JSON.stringify([
          { name: '现状诊断', tasks: [{ name: '业务调研', priority: 'high' }, { name: '技术评估', priority: 'high' }, { name: '痛点分析', priority: 'medium' }] },
          { name: '方案规划', tasks: [{ name: '方案设计', priority: 'high' }, { name: '实施路线图', priority: 'medium' }] },
          { name: '报告交付', tasks: [{ name: '咨询报告编写', priority: 'high' }, { name: '汇报与评审', priority: 'high' }] },
        ]),
      },
    ])
  }
  console.log('2 projects + 3 members + 5 tasks + 2 deliverables + 3 project templates created.')

  // 8.5 Contract templates
  if (schema.contractTemplates) {
    const svcContent = `<h2>技术服务合同</h2>
<p>本合同由以下双方于 <strong>{{startDate}}</strong> 签署：</p>
<p><strong>甲方（委托方）：{{partyA}}</strong></p>
<p><strong>乙方（服务方）：{{partyB}}</strong></p>
<h3>第一条 服务内容</h3>
<p>乙方根据甲方需求，提供以下技术服务：{{serviceContent}}</p>
<h3>第二条 服务期限</h3>
<p>本合同服务期限自 {{startDate}} 起至 {{endDate}} 止，共计 {{servicePeriod}}。</p>
<h3>第三条 服务费用及支付</h3>
<p>本合同总金额为人民币 {{totalAmount}} 元。甲方应按照双方约定的付款计划按时支付。</p>
<h3>第四条 双方权利与义务</h3>
<p>1. 甲方应提供必要的配合与支持，包括但不限于提供相关资料、安排对接人员等。</p>
<p>2. 乙方应按照约定的服务标准和时间节点完成服务工作。</p>
<h3>第五条 保密条款</h3>
<p>双方应对在履行本合同过程中知悉的对方商业秘密予以保密。</p>
<h3>第六条 违约责任</h3>
<p>任何一方违反本合同约定，应承担相应的违约责任。</p>
<h3>第七条 争议解决</h3>
<p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，提交甲方所在地人民法院管辖。</p>
<p style="margin-top:40px;">甲方（盖章）：___________</p>
<p>乙方（盖章）：___________</p>
<p>签署日期：{{startDate}}</p>`

    const salesContent = `<h2>产品销售合同</h2>
<p>本合同由以下双方于 <strong>{{startDate}}</strong> 签署：</p>
<p><strong>甲方（买方）：{{partyA}}</strong></p>
<p><strong>乙方（卖方）：{{partyB}}</strong></p>
<h3>第一条 产品信息</h3>
<p>甲方向乙方购买以下产品：</p>
<p>{{productList}}</p>
<h3>第二条 合同金额</h3>
<p>本合同总金额为人民币 {{totalAmount}} 元（含税）。</p>
<h3>第三条 交付时间与地点</h3>
<p>乙方应于 {{deliveryDate}} 前将产品交付至甲方指定地点。</p>
<h3>第四条 付款方式</h3>
<p>甲方采用以下方式支付：{{paymentMethod}}</p>
<h3>第五条 质量保证</h3>
<p>1. 乙方保证所供产品符合国家相关质量标准及合同约定。</p>
<p>2. 产品质保期为验收合格之日起12个月。</p>
<h3>第六条 验收</h3>
<p>甲方应在收到产品后7个工作日内完成验收，逾期未提出异议视为验收合格。</p>
<h3>第七条 违约责任</h3>
<p>任何一方违反本合同约定，应承担相应的违约责任。</p>
<h3>第八条 争议解决</h3>
<p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，提交乙方所在地人民法院管辖。</p>
<p style="margin-top:40px;">甲方（盖章）：___________</p>
<p>乙方（盖章）：___________</p>
<p>签署日期：{{startDate}}</p>`

    const procurementContent = `<h2>采购合同</h2>
<p>本合同由以下双方于 <strong>{{startDate}}</strong> 签署：</p>
<p><strong>甲方（采购方）：{{partyA}}</strong></p>
<p><strong>乙方（供应方）：{{partyB}}</strong></p>
<h3>第一条 采购内容</h3>
<p>甲方向乙方采购以下产品/服务：</p>
<p>{{goodsDescription}}</p>
<h3>第二条 合同金额</h3>
<p>本合同总金额为人民币 {{totalAmount}} 元（含税）。</p>
<h3>第三条 交付时间与地点</h3>
<p>乙方应于 {{deliveryDate}} 前完成全部交付。</p>
<h3>第四条 质量标准</h3>
<p>交付产品/服务应符合国家相关标准及合同约定的技术规格要求。</p>
<h3>第五条 验收</h3>
<p>甲方应在收到产品/服务后10个工作日内完成验收。</p>
<h3>第六条 付款方式</h3>
<p>验收合格后，甲方在收到乙方开具的合法有效发票后30个工作日内支付。</p>
<h3>第七条 违约责任</h3>
<p>任何一方违反本合同约定，应承担相应的违约责任。</p>
<h3>第八条 争议解决</h3>
<p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，提交甲方所在地人民法院管辖。</p>
<p style="margin-top:40px;">甲方（盖章）：___________</p>
<p>乙方（盖章）：___________</p>
<p>签署日期：{{startDate}}</p>`

    await db.insert(schema.contractTemplates).values([
      {
        id: generateId(),
        name: '技术服务合同',
        category: 'service',
        content: svcContent,
        placeholders: JSON.stringify([
          { key: 'partyA', label: '甲方名称' },
          { key: 'partyB', label: '乙方名称' },
          { key: 'startDate', label: '开始日期' },
          { key: 'endDate', label: '结束日期' },
          { key: 'serviceContent', label: '服务内容描述' },
          { key: 'servicePeriod', label: '服务期限' },
          { key: 'totalAmount', label: '合同金额' },
        ]),
        sortOrder: 1,
        createdBy: userIds.admin,
      },
      {
        id: generateId(),
        name: '产品销售合同',
        category: 'sales',
        content: salesContent,
        placeholders: JSON.stringify([
          { key: 'partyA', label: '甲方（买方）' },
          { key: 'partyB', label: '乙方（卖方）' },
          { key: 'startDate', label: '签署日期' },
          { key: 'totalAmount', label: '合同金额' },
          { key: 'paymentMethod', label: '付款方式' },
          { key: 'deliveryDate', label: '交付日期' },
          { key: 'productList', label: '产品清单' },
        ]),
        sortOrder: 2,
        createdBy: userIds.admin,
      },
      {
        id: generateId(),
        name: '采购合同',
        category: 'procurement',
        content: procurementContent,
        placeholders: JSON.stringify([
          { key: 'partyA', label: '甲方（采购方）' },
          { key: 'partyB', label: '乙方（供应方）' },
          { key: 'startDate', label: '签署日期' },
          { key: 'totalAmount', label: '合同金额' },
          { key: 'goodsDescription', label: '采购内容描述' },
          { key: 'deliveryDate', label: '交付日期' },
        ]),
        sortOrder: 3,
        createdBy: userIds.admin,
      },
    ])
  }
  console.log('3 contract templates created.')

  // 9. Commission rules
  const ruleIds = [generateId(), generateId()]
  if (schema.commissionRules) {
    await db.insert(schema.commissionRules).values([
      { id: ruleIds[0]!, name: '通用提成规则', baseType: 'contract_amount', rate: 0.05, minAmount: 0, isActive: 'yes' as const },
      { id: ruleIds[1]!, name: '软件产品提成', baseType: 'contract_amount', rate: 0.08, productId: productData[0]!.id, minAmount: 0, isActive: 'yes' as const },
    ])
  }
  // Commissions
  if (schema.commissions) {
    await db.insert(schema.commissions).values([
      { id: generateId(), userId: userIds.salesManager, contractId: contractData[0]!.id, ruleId: ruleIds[0]!, baseAmount: 200000, rate: 0.05, amount: 10000, status: 'approved', periodMonth: '2026-06' },
      { id: generateId(), userId: userIds.salesManager, contractId: contractData[1]!.id, ruleId: ruleIds[0]!, baseAmount: 120000, rate: 0.05, amount: 6000, status: 'pending', periodMonth: '2026-06' },
    ])
  }
  console.log('2 commission rules + 2 commissions created.')

  // 10. Notifications
  if (schema.notifications) {
    await db.insert(schema.notifications).values([
      { id: generateId(), userId: userIds.salesMember, title: '客户「星辰科技」需要跟进', content: '上次跟进已超过7天，建议尽快联系', type: 'remind', relatedId: customerData[0]!.id, relatedType: 'customer' },
      { id: generateId(), userId: userIds.salesManager, title: '合同 HT-2026-001 已审批通过', content: '远航物流-ERP实施合同已通过审批，可以开始执行', type: 'approval', relatedId: contractData[0]!.id, relatedType: 'contract' },
      { id: generateId(), userId: userIds.salesManager, title: '提成 ¥10,000 已到账', content: '远航物流合同提成已审批通过', type: 'commission' },
      { id: generateId(), userId: userIds.admin, title: '系统备份提醒', content: '距离上次数据备份已超过30天', type: 'system' },
      { id: generateId(), userId: userIds.salesMember, title: '任务「需求调研」已完成', content: '远航ERP项目中您的任务已标记完成', type: 'remind', relatedId: null as unknown as string, relatedType: 'task' },
    ])
  }
  console.log('5 notifications created.')

  // 11. System config
  if (schema.systemConfig) {
    await db.insert(schema.systemConfig).values([
      { id: generateId(), key: 'company_name', value: '我的公司', updatedAt: now() },
      { id: generateId(), key: 'system_name', value: '一体化管理', updatedAt: now() },
      { id: generateId(), key: 'upload_path', value: 'data/uploads', updatedAt: now() },
    ])
  }
  console.log('3 system configs created.')

  console.log('\n✅ Seed complete!')
  console.log('Login credentials:')
  console.log('  admin   / admin123   (管理员)')
  console.log('  manager / manager123 (销售负责人)')
  console.log('  sales   / sales123   (销售成员)')
  console.log('  finance / finance123 (财务)')
}

async function main() {
  // Step 1: already pushed schema via drizzle-kit above
  // Step 2: Seed data
  await seed()
  sqlite.close()
}

main().catch(console.error)
