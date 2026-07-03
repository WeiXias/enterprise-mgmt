import { db } from '#database'
import { dictEntries } from '#schema'
import { productCategories } from '#schema/products'
import { tags } from '#schema/customers'
import { generateId } from '#server-utils/id'
import { eq } from 'drizzle-orm'
import { accountsSeedData } from '../database/seed/accounts'

const seedDictData: { dict_type: string; value: string; label: string; sort: string }[] = [
  ...['信息技术','软件开发','人工智能','网络安全','电子商务','制造业','金融','教育','医疗','房地产','物流','其他'].map((v, i) => ({
    dict_type: 'industry', value: v, label: v, sort: String(i),
  })),
  ...['主动联系','客户介绍','展会','网络推广','电话营销','其他'].map((v, i) => ({
    dict_type: 'opportunity_source', value: v, label: v, sort: String(i),
  })),
]

export default defineNitroPlugin(async () => {
  // 改为逐类型检查是否已同步
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 1. 行业 / 商机来源
  const existing = await db.select().from(dictEntries).limit(2)
  if (existing.length === 0) {
    for (const item of seedDictData) {
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: item.dict_type,
        value: item.value,
        label: item.label,
        sort: item.sort,
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      })
    }
    console.log(`[dict-seed] 行业/来源初始化 (${seedDictData.length} 条)`)
  }

  // 同步已有表的分类数据到 dict
  const syncCategory = async (dictType: string, rows: { name: string; sort?: string }[], mapValue?: (r: any) => string) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: dictType,
        value: mapValue ? mapValue(r) : r.name,
        label: r.name,
        sort: r.sort || String(i),
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      }).catch(() => { /* ignore dup */ })
    }
  }

  // 2. 产品分类
  const productCatRows = await db.select().from(productCategories)
  const existingProductCat = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'product_category')).limit(1)
  if (existingProductCat.length === 0 && productCatRows.length > 0) {
    await syncCategory('product_category', productCatRows as any)
    console.log(`[dict-seed] 产品分类同步 (${productCatRows.length} 条)`)
  }

  // 3. 客户标签
  const tagRows = await db.select().from(tags)
  const existingTags = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'customer_tag')).limit(1)
  if (existingTags.length === 0 && tagRows.length > 0) {
    await syncCategory('customer_tag', tagRows as any)
    console.log(`[dict-seed] 客户标签同步 (${tagRows.length} 条)`)
  }

  // 4. 会计科目（系统预置）
  const { accounts: accountsTable } = await import('../database/schema/accounting')
  const existingAccounts = await db.select().from(accountsTable).limit(1)
  if (existingAccounts.length === 0) {
    // 先插入一级科目，再插入二级科目（利用 parentCode 映射 parentId）
    const codeToId = new Map<string, string>()
    const level1Items = accountsSeedData.filter(a => a.level === 1)
    const level2Items = accountsSeedData.filter(a => a.level === 2)

    for (const item of level1Items) {
      const id = generateId()
      codeToId.set(item.code, id)
      await db.insert(accountsTable).values({
        id,
        code: item.code,
        name: item.name,
        parentId: null,
        categoryType: item.categoryType,
        balanceDirection: item.balanceDirection,
        level: 1,
        sort: item.sort,
        isSystem: 1,
        createdAt: now,
        updatedAt: now,
      } as any).catch(() => {})
    }

    for (const item of level2Items) {
      const parentId = item.parentCode ? codeToId.get(item.parentCode) : null
      await db.insert(accountsTable).values({
        id: generateId(),
        code: item.code,
        name: item.name,
        parentId,
        categoryType: item.categoryType,
        balanceDirection: item.balanceDirection,
        level: 2,
        sort: item.sort,
        isSystem: 1,
        createdAt: now,
        updatedAt: now,
      } as any).catch(() => {})
    }
    console.log(`[dict-seed] 会计科目初始化 (${accountsSeedData.length} 个)`)
  }

  // 5. 会计期间（当前年度 1-12 月）
  const { accountingPeriods: accountingPeriodsTable } = await import('../database/schema/accounting')
  const existingPeriods = await db.select().from(accountingPeriodsTable).limit(1)
  if (existingPeriods.length === 0) {
    const currentYear = new Date().getFullYear()
    for (let m = 1; m <= 12; m++) {
      const startDate = `${currentYear}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(currentYear, m, 0).getDate()
      const endDate = `${currentYear}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      await db.insert(accountingPeriodsTable).values({
        id: generateId(),
        year: currentYear,
        month: m,
        startDate,
        endDate,
        createdAt: now,
      } as any).catch(() => {})
    }
    console.log(`[dict-seed] 会计期间初始化 (${currentYear} 年 1-12 月)`)
  }

  // 5. 报销类型
  const existingReimb = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'reimbursement_type')).limit(1)
  if (existingReimb.length === 0) {
    const reimbSeeds = ['办公用品', '差旅费', '招待费', '其他']
    for (let i = 0; i < reimbSeeds.length; i++) {
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: 'reimbursement_type',
        value: reimbSeeds[i],
        label: reimbSeeds[i],
        sort: String(i),
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      }).catch(() => {})
    }
    console.log(`[dict-seed] 报销类型初始化 (${reimbSeeds.length} 条)`)
  }

  // 6. 产品单位/厂家（业务字典扩展）
  const unitSeeds = ['台', '件', '套', '箱', '个', '米', '千克', '升', '卷', '张']
  const existingUnit = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'product_unit')).limit(1)
  if (existingUnit.length === 0) {
    for (let i = 0; i < unitSeeds.length; i++) {
      await db.insert(dictEntries).values({
        id: generateId(), dict_type: 'product_unit', value: unitSeeds[i], label: unitSeeds[i],
        sort: String(i), is_active: '1', createdAt: now, updatedAt: now,
      }).catch(() => {})
    }
    console.log(`[dict-seed] 产品单位初始化 (${unitSeeds.length} 条)`)
  }

  const mfrSeeds = ['华为', '联想', '戴尔', '惠普', '西门子', '施耐德', 'ABB', '海康威视', '大华', '小米', '三星', '索尼']
  const existingMfr = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'product_manufacturer')).limit(1)
  if (existingMfr.length === 0) {
    for (let i = 0; i < mfrSeeds.length; i++) {
      await db.insert(dictEntries).values({
        id: generateId(), dict_type: 'product_manufacturer', value: mfrSeeds[i], label: mfrSeeds[i],
        sort: String(i), is_active: '1', createdAt: now, updatedAt: now,
      }).catch(() => {})
    }
    console.log(`[dict-seed] 生产厂家初始化 (${mfrSeeds.length} 条)`)
  }

  // 7. 产品规格模板
  const specSeeds: { dict_type: string; items: string[] }[] = [
    { dict_type: 'spec_template_hardware', items: ['CPU', '内存', '硬盘', '显卡', '主板', '电源', '机箱', '散热器'] },
    { dict_type: 'spec_template_software', items: ['版本号', '授权方式', '支持系统', '语言', '位数'] },
    { dict_type: 'spec_template_service', items: ['服务内容', '服务周期', '响应时间', '交付物'] },
  ]
  for (const spec of specSeeds) {
    const existingSpec = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, spec.dict_type)).limit(1)
    if (existingSpec.length === 0) {
      for (let i = 0; i < spec.items.length; i++) {
        await db.insert(dictEntries).values({
          id: generateId(),
          dict_type: spec.dict_type,
          value: spec.items[i],
          label: spec.items[i],
          sort: String(i),
          is_active: '1',
          createdAt: now,
          updatedAt: now,
        } as any).catch(() => {})
      }
      console.log(`[dict-seed] ${spec.dict_type} 初始化 (${spec.items.length} 条)`)
    }
  }
})
